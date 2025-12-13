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

// NEW: Create show card
function makePageForShow(showData, highlightTerm = "") {
  const template = document.getElementById("show-template");
  const card = template.content.cloneNode(true);

  card.querySelector(".episode-title").innerHTML = highlightText(showData.name, highlightTerm);
  card.querySelector(".episode-summary").innerHTML = `<p>${highlightText(stripHtml(showData.summary || "No summary available."), highlightTerm)}</p>`;

  const imgEl = card.querySelector(".episode-image");
  if (showData.image && (showData.image.medium || showData.image.original)) {
    imgEl.src = showData.image.medium || showData.image.original;
    imgEl.alt = `${showData.name} image`;
  } else {
    imgEl.removeAttribute("src");
    imgEl.alt = "No image available";
  }

  card.querySelector(".show-genres").textContent = showData.genres?.join(", ") || "N/A";
  card.querySelector(".show-status").textContent = showData.status || "N/A";
  card.querySelector(".show-rating").textContent = showData.rating?.average || "N/A";
  card.querySelector(".show-runtime").textContent = showData.runtime || "N/A";

  // Add click handler
  const cardElement = card.querySelector(".show-card");
  cardElement.style.cursor = "pointer";
  cardElement.addEventListener("click", () => {
    loadEpisodesForShow(showData.id, showData.name);
  });

  return card;
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

// NEW: Render shows
function renderShows(showsArray, highlightTerm = "") {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const show of showsArray) frag.appendChild(makePageForShow(show, highlightTerm));
  container.appendChild(frag);
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

function updateCountDisplay(currentCount, total, isShows = false) {
  const elId = isShows ? "show-display-count" : "display-count";
  const el = document.getElementById(elId);
  const type = isShows ? "shows" : "episodes";
  el.textContent = `Displaying ${currentCount}/${total} ${type}`;
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
  const showSearchInput = document.getElementById("show-search");
  const episodeSelect = document.getElementById("episode-select");
  const backButton = document.getElementById("back-to-shows");

  let allShows = [];
  let allEpisodes = [];
  let totalEpisodes = 0;
  let currentShowName = "";

  // NEW: Load and display shows
  function loadShows() {
    const url = "https://api.tvmaze.com/shows";
    fetchWithCache(url)
      .then((shows) => {
        allShows = shows.sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()));
        renderShows(allShows, "");
        updateCountDisplay(allShows.length, allShows.length, true);
        showShowsView();
      })
      .catch((e) => {
        console.error("Shows load failed", e);
      });
  }

  // NEW: Show/hide views
  function showShowsView() {
    document.getElementById("shows-controls").style.display = "flex";
    document.getElementById("episodes-controls").style.display = "none";
  }

  function showEpisodesView() {
    document.getElementById("shows-controls").style.display = "none";
    document.getElementById("episodes-controls").style.display = "flex";
  }

  // Modified to accept showId and showName
  function loadEpisodesForShow(showId, showName) {
    currentShowName = showName;
    const epUrl = `https://api.tvmaze.com/shows/${showId}/episodes`;
    renderEpisodes([], "");
    updateCountDisplay(0, 0);
    showEpisodesView();
    
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

  // NEW: Show search
  function applyShowSearch() {
    const term = showSearchInput.value.trim();
    if (term === "") {
      renderShows(allShows, "");
      updateCountDisplay(allShows.length, allShows.length, true);
      return;
    }
    const lower = term.toLowerCase();
    const filtered = allShows.filter((show) => {
      const name = (show.name || "").toLowerCase();
      const summary = stripHtml(show.summary || "").toLowerCase();
      const genres = (show.genres || []).join(" ").toLowerCase();
      return name.includes(lower) || summary.includes(lower) || genres.includes(lower);
    });
    renderShows(filtered, term);
    updateCountDisplay(filtered.length, allShows.length, true);
  }

  function applyEpisodeSearch() {
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

  // Event listeners
  showSearchInput.addEventListener("input", applyShowSearch);
  searchInput.addEventListener("input", applyEpisodeSearch);

  backButton.addEventListener("click", () => {
    renderShows(allShows, "");
    updateCountDisplay(allShows.length, allShows.length, true);
    showShowsView();
    showSearchInput.value = "";
  });

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
  });

  // Start by loading shows
  loadShows();
}

window.addEventListener("load", setup);
