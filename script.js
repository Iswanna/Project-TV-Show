// Helper: strip HTML to plain text
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

// Wrap matches with <mark>, safe for plain text input
function highlightText(text, term) {
  if (!term) return text;
  const esc = escapeRegExp(term);
  const re = new RegExp(esc, "gi");
  return text.replace(re, (match) => `<mark>${match}</mark>`);
}

function makePageForEpisode(episodeData, highlightTerm = "") {
  const template = document.getElementById("episode-template");
  const card = template.content.cloneNode(true);

  // Title and code combined in the title area like example "Winter is Coming - S01E01"
  const code = formatEpisodeCode(episodeData.season, episodeData.number);
  const titleText = `${episodeData.name} - ${code}`;
  // Highlight matches in title
  const titleHtml = highlightText(titleText, highlightTerm);
  card.querySelector(".episode-title").innerHTML = titleHtml;

  // Put season/episode info (kept but not the main visual focal point)
  card.querySelector(".episode-season").textContent = episodeData.season;
  card.querySelector(".episode-number").textContent = episodeData.number;
  card.querySelector(".episode-code").textContent = code;

  // Image
  const imgEl = card.querySelector(".episode-image");
  if (
    episodeData.image &&
    (episodeData.image.medium || episodeData.image.original)
  ) {
    imgEl.src = episodeData.image.medium || episodeData.image.original;
    imgEl.alt = `${episodeData.name} image`;
  } else {
    imgEl.removeAttribute("src");
    imgEl.alt = "No image available";
  }

  // Summary: keep original HTML structure is fine, but to highlight matches we use text-only replacement
  const summaryText = stripHtml(episodeData.summary || "No summary available.");
  const summaryHtml = highlightText(summaryText, highlightTerm);
  card.querySelector(".episode-summary").innerHTML = `<p>${summaryHtml}</p>`;

  // Attribution
  const linkEl = card.querySelector(".episode-link");
  linkEl.href = episodeData.url || "#";
  linkEl.target = "_blank";

  // stable id for scrolling
  const article = card.querySelector(".episode-card");
  if (article) article.id = `episode-${code}`;

  return card;
}

function renderEpisodes(episodesArray, highlightTerm = "") {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const ep of episodesArray) {
    frag.appendChild(makePageForEpisode(ep, highlightTerm));
  }
  container.appendChild(frag);
}

function populateSelector(episodes) {
  const select = document.getElementById("episode-select");
  select.innerHTML = '<option value="all">All episodes</option>';
  for (const ep of episodes) {
    const code = formatEpisodeCode(ep.season, ep.number);
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} - ${ep.name}`;
    select.appendChild(opt);
  }
}

function updateCountDisplay(currentCount, total) {
  const el = document.getElementById("display-count");
  el.textContent = `Displaying ${currentCount}/${total} episodes.`;
}

// New global state to replace episodes.js
const state = {
  episodes: [],
  loaded: false,
  error: "",
};

const endpoint = "https://api.tvmaze.com/shows/82/episodes";

// Level 300: fetch episodes from API, handle loading, error, and only do this ONCE.
function fetchEpisodes() {
  state.loaded = false;
  state.error = "";
  return fetch(endpoint)
    .then((response) => {
      if (!response.ok) throw new Error(`API error ${response.status}`);
      return response.json();
    })
    .then((data) => {
      state.episodes = data;
      state.loaded = true;
      return data;
    })
    .catch((err) => {
      state.error = "Failed to load episode data. Please try again later.";
      state.loaded = true;
      return [];
    });
}

// Render loading or error if appropriate
function renderStatus() {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const displayCount = document.getElementById("display-count");
  if (!state.loaded) {
    container.innerHTML = "<h3>Loading episodes...</h3>";
    displayCount.textContent = "";
  } else if (state.error) {
    container.innerHTML = `<h3 style="color: red;">${state.error}</h3>`;
    displayCount.textContent = "";
  }
}

// MAIN setup function (runs after DOM loaded)
function setup() {
  renderStatus(); // show loading initially

  fetchEpisodes().then(() => {
    if (state.error) {
      renderStatus();
      return;
    }
    const episodes = state.episodes;
    const total = episodes.length;
    const allEpisodes = [...episodes];

    populateSelector(allEpisodes);
    renderEpisodes(allEpisodes, "");
    updateCountDisplay(allEpisodes.length, total);

    const searchInput = document.getElementById("search");
    const select = document.getElementById("episode-select");

    function applySearchAndRender() {
      const term = searchInput.value.trim();
      if (term === "") {
        renderEpisodes(allEpisodes, "");
        updateCountDisplay(allEpisodes.length, total);
        select.value = "all";
        return;
      }
      const lower = term.toLowerCase();
      const filtered = allEpisodes.filter((ep) => {
        const name = (ep.name || "").toLowerCase();
        const summary = stripHtml(ep.summary).toLowerCase();
        return name.includes(lower) || summary.includes(lower);
      });
      renderEpisodes(filtered, term);
      updateCountDisplay(filtered.length, total);
      select.value = "all";
    }

    // live search (immediate per keystroke)
    searchInput.addEventListener("input", applySearchAndRender);

    // selector behaviour — show only selected episode (bonus)
    select.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "all") {
        renderEpisodes(allEpisodes, "");
        updateCountDisplay(allEpisodes.length, total);
        searchInput.value = "";
        return;
      }
      const chosen = allEpisodes.find(
        (ep) => formatEpisodeCode(ep.season, ep.number) === val
      );
      if (!chosen) {
        renderEpisodes(allEpisodes, "");
        updateCountDisplay(allEpisodes.length, total);
        return;
      }
      renderEpisodes([chosen], ""); // no highlight by default when selecting
      updateCountDisplay(1, total);
      searchInput.value = "";
      // scroll into view
      setTimeout(() => {
        const el = document.getElementById(`episode-${val}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
    });
  });
}

window.onload = setup;
