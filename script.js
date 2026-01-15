// Global state - single source of truth
const state = {
  allShows: [],
  allEpisodes: [],
  currentView: 'shows',
  currentShowId: null,
  currentShowName: null,
  searchTerm: '',
  episodeSearchTerm: '',
  selectedEpisodeCode: 'all'
};

// Derived values - computed from state
const getTotalEpisodes = () => state.allEpisodes.length;
const getTotalShows = () => state.allShows.length;

const getFilteredShows = () => {
  if (!state.searchTerm) return state.allShows;
  
  const lower = state.searchTerm.toLowerCase();
  return state.allShows.filter((show) => {
    const name = (show.name || "").toLowerCase();
    const summary = stripHtml(show.summary || "").toLowerCase();
    const genres = (show.genres || []).join(" ").toLowerCase();
    return name.includes(lower) || summary.includes(lower) || genres.includes(lower);
  });
};

const getFilteredEpisodes = () => {
  if (state.selectedEpisodeCode !== 'all') {
    const chosen = state.allEpisodes.find((ep) => 
      formatEpisodeCode(ep.season, ep.number) === state.selectedEpisodeCode
    );
    return chosen ? [chosen] : state.allEpisodes;
  }
  
  if (!state.episodeSearchTerm) return state.allEpisodes;
  
  const lower = state.episodeSearchTerm.toLowerCase();
  return state.allEpisodes.filter((ep) => {
    const name = (ep.name || "").toLowerCase();
    const summary = stripHtml(ep.summary || "").toLowerCase();
    return name.includes(lower) || summary.includes(lower);
  });
};

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

  const linkWrapper = card.querySelector(".episode-link-wrapper");
  linkWrapper.href = episodeData.url || "#";
  
  const cardElement = card.querySelector(".episode-card");
  cardElement.style.cursor = "pointer";

  return card;
}

function renderShows(showsArray, highlightTerm = "") {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const show of showsArray) frag.appendChild(makePageForShow(show, highlightTerm));
  container.appendChild(frag);
}

function renderEpisodes() {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  const filtered = getFilteredEpisodes(); // ✅ Use derived function
  for (const ep of filtered) {
    frag.appendChild(makePageForEpisode(ep, state.episodeSearchTerm)); // ✅ Use state
  }
  container.appendChild(frag);
  updateCountDisplay(filtered.length, getTotalEpisodes()); // ✅ Use derived
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
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function saveToLocalStorage(key, data) {
  try {
    const item = {
      data: data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

function getFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (e) {
    console.error('Failed to get from localStorage', e);
    return null;
  }
}

function clearExpiredCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch (e) {}
      }
    });
  } catch (e) {
    console.error('Failed to clear expired cache', e);
  }
}

async function fetchWithCache(url) {
  if (fetchCache.has(url)) {
    return fetchCache.get(url);
  }
  
  const cachedData = getFromLocalStorage(url);
  if (cachedData) {
    const promise = Promise.resolve(cachedData);
    fetchCache.set(url, promise);
    return promise;
  }
  
  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    
    saveToLocalStorage(url, data);
    
    return data;
  })();
  
  fetchCache.set(url, promise);
  return promise;
}

function showShowsView() {
  state.currentView = 'shows'; // ✅ Update state
  document.getElementById("shows-controls").style.display = "flex";
  document.getElementById("episodes-controls").style.display = "none";
}

function showEpisodesView() {
  state.currentView = 'episodes'; // ✅ Update state
  document.getElementById("shows-controls").style.display = "none";
  document.getElementById("episodes-controls").style.display = "flex";
}

async function loadEpisodesForShow(showId, showName) {
  state.currentShowName = showName;
  state.currentShowId = showId;
  const epUrl = `https://api.tvmaze.com/shows/${showId}/episodes`;
  renderEpisodes([], "");
  updateCountDisplay(0, 0);
  showEpisodesView();
  
  history.pushState({ view: 'episodes', showId, showName }, '', `#show/${showId}`);
  
  try {
    const episodes = await fetchWithCache(epUrl);
    state.allEpisodes = Array.isArray(episodes) ? episodes.slice() : [];
    populateEpisodeSelector(state.allEpisodes);
    renderEpisodes(getFilteredEpisodes(), state.episodeSearchTerm);
    updateCountDisplay(getFilteredEpisodes().length, getTotalEpisodes());
    const searchInput = document.getElementById("search");
    const episodeSelect = document.getElementById("episode-select");
    searchInput.value = "";
    episodeSelect.value = "all";
  } catch (err) {
    console.error("Episodes load failed", err);
    renderEpisodes([], "");
    updateCountDisplay(0, 0);
  }
}

function setup() {
  clearExpiredCache();
  
  const searchInput = document.getElementById("search");
  const showSearchInput = document.getElementById("show-search");
  const episodeSelect = document.getElementById("episode-select");
  const backButton = document.getElementById("back-to-shows");

  async function loadShows() {
    const url = "https://api.tvmaze.com/shows";
    try {
      const shows = await fetchWithCache(url);
      state.allShows = shows.sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()));
      renderShows(getFilteredShows(), state.searchTerm);
      updateCountDisplay(getFilteredShows().length, getTotalShows(), true);
      showShowsView();
      
      if (!history.state) {
        history.replaceState({ view: 'shows' }, '', '#shows');
      }
    } catch (e) {
      console.error("Shows load failed", e);
    }
  }

  function applyShowSearch() {
    state.searchTerm = showSearchInput.value.trim();
    renderShows(getFilteredShows(), state.searchTerm);
    updateCountDisplay(getFilteredShows().length, getTotalShows(), true);
  }

  function applyEpisodeSearch() {
    state.episodeSearchTerm = searchInput.value.trim();
    renderEpisodes(getFilteredEpisodes(), state.episodeSearchTerm);
    updateCountDisplay(getFilteredEpisodes().length, getTotalEpisodes());
    episodeSelect.value = "all";
  }

  showSearchInput.addEventListener("input", applyShowSearch);
  searchInput.addEventListener("input", applyEpisodeSearch);

  backButton.addEventListener("click", () => {
    state.currentView = 'shows';
    renderShows(getFilteredShows(), state.searchTerm);
    updateCountDisplay(getFilteredShows().length, getTotalShows(), true);
    showShowsView();
    showSearchInput.value = "";
    history.pushState({ view: 'shows' }, '', '#shows');
  });

  episodeSelect.addEventListener("change", (e) => {
    state.selectedEpisodeCode = e.target.value;
    renderEpisodes(getFilteredEpisodes(), state.episodeSearchTerm);
    updateCountDisplay(getFilteredEpisodes().length, getTotalEpisodes());
    searchInput.value = "";
  });

  window.addEventListener('popstate', (event) => {
    if (event.state) {
      if (event.state.view === 'shows') {
        state.currentView = 'shows';
        renderShows(getFilteredShows(), state.searchTerm);
        updateCountDisplay(getFilteredShows().length, getTotalShows(), true);
        showShowsView();
        showSearchInput.value = "";
      } else if (event.state.view === 'episodes') {
        loadEpisodesForShow(event.state.showId, event.state.showName);
      }
    }
  });

  loadShows();
}

window.addEventListener("load", setup);

const backToTopButton = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  if (window.pageYOffset > 300) {
    backToTopButton.classList.add("show");
  } else {
    backToTopButton.classList.remove("show");
  }
});

backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
