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

function highlightText(text, term) {
  if (!term) return text;
  const esc = escapeRegExp(term);
  const re = new RegExp(esc, "gi");
  return text.replace(re, (match) => `<mark>${match}</mark>`);
}

function makePageForEpisode(episodeData, highlightTerm = "") {
  const template = document.getElementById("episode-template");
  const card = template.content.cloneNode(true);

  const code = formatEpisodeCode(episodeData.season, episodeData.number);
  const titleText = `${episodeData.name} - ${code}`;
  card.querySelector(".episode-title").innerHTML = highlightText(titleText, highlightTerm);

  card.querySelector(".episode-summary").innerHTML = `<p>${highlightText(stripHtml(episodeData.summary || "No summary available."), highlightTerm)}</p>`;

  const imgEl = card.querySelector(".episode-image");
  if (episodeData.image && (episodeData.image.medium || episodeData.image.original)) {
    imgEl.src = episodeData.image.medium || episodeData.image.original;
    imgEl.alt = `${episodeData.name} image`;
  } else {
    imgEl.removeAttribute("src");
    imgEl.alt = "No image available";
  }

  const linkEl = card.querySelector(".episode-link");
  linkEl.href = episodeData.url || "#";
  linkEl.target = "_blank";

  return card;
}

function renderEpisodes(episodesArray, highlightTerm = "") {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const ep of episodesArray) frag.appendChild(makePageForEpisode(ep, highlightTerm));
  container.appendChild(frag);
}

function populateEpisodeSelector(episodes) {
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

const fetchCache = new Map();
function fetchWithCache(url) {
  if (fetchCache.has(url)) return fetchCache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error("Network error");
    return r.json();
  });
  fetchCache.set(url, p);
  return p;
}

function setup() {
  const searchInput = document.getElementById("search");
  const episodeSelect = document.getElementById("episode-select");
  const showSelect = document.getElementById("show-select");

  let allEpisodes = [];
  let totalEpisodes = 0;

  function loadShows() {
    const url = "https://api.tvmaze.com/shows";
    fetchWithCache(url)
      .then((shows) => {
        shows.sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()));
        showSelect.innerHTML = '<option value="">Select a show...</option>';
        for (const s of shows) {
          const o = document.createElement("option");
          o.value = s.id;
          o.textContent = s.name;
          showSelect.appendChild(o);
        }
       
        if (showSelect.options.length > 1) {
          showSelect.selectedIndex = 1;
          loadEpisodesForShow(showSelect.value);
        }
      })
      .catch((e) => {
        console.error("Shows load failed", e);
        showSelect.innerHTML = '<option value="">(Could not load shows)</option>';
      });
  }

  function loadEpisodesForShow(showId) {
    if (!showId) return;
    const epUrl = `https://api.tvmaze.com/shows/${showId}/episodes`;
    renderEpisodes([], "");
    updateCountDisplay(0, 0);
    fetchWithCache(epUrl)
      .then((episodes) => {
        allEpisodes = Array.isArray(episodes) ? episodes.slice() : [];
        totalEpisodes = allEpisodes.length;
        populateEpisodeSelector(allEpisodes);
        renderEpisodes(allEpisodes, "");
        updateCountDisplay(allEpisodes.length, totalEpisodes);
        searchInput.value = "";
        episodeSelect.value = "all";
      })
      .catch((err) => {
        console.error("Episodes load failed", err);
        renderEpisodes([], "");
        updateCountDisplay(0, 0);
      });
  }

  function applySearchAndRender() {
    const term = searchInput.value.trim();
    const total = totalEpisodes || allEpisodes.length;
    if (term === "") {
      renderEpisodes(allEpisodes, "");
      updateCountDisplay(allEpisodes.length, total);
      episodeSelect.value = "all";
      return;
    }
    const lower = term.toLowerCase();
    const filtered = allEpisodes.filter((ep) => {
      const name = (ep.name || "").toLowerCase();
      const summary = stripHtml(ep.summary || "").toLowerCase();
      return name.includes(lower) || summary.includes(lower);
    });
    renderEpisodes(filtered, term);
    updateCountDisplay(filtered.length, total);
    episodeSelect.value = "all";
  }

  searchInput.addEventListener("input", applySearchAndRender);

  episodeSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    const total = totalEpisodes || allEpisodes.length;
    if (val === "all") {
      renderEpisodes(allEpisodes, "");
      updateCountDisplay(allEpisodes.length, total);
      searchInput.value = "";
      return;
    }
    const chosen = allEpisodes.find((ep) => formatEpisodeCode(ep.season, ep.number) === val);
    if (!chosen) {
      renderEpisodes(allEpisodes, "");
      updateCountDisplay(allEpisodes.length, total);
      return;
    }
    renderEpisodes([chosen], "");
    updateCountDisplay(1, total);
    searchInput.value = "";
    setTimeout(() => {
      const el = document.getElementById(`episode-${val}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  });

  showSelect.addEventListener("change", (e) => {
    const id = e.target.value;
    if (!id) return;
    loadEpisodesForShow(id);
  });

  loadShows();
}

window.addEventListener("load", setup);
