/**
 * [1] INITIALIZATION: The State Object
 * This is the "single source of truth" for the app.
 * If the app forgets what the user typed or what shows it fetched, it looks here.
 */
const state = {
  allShows: [], // Stores the full list of shows from the API
  allEpisodes: [], // Stores episodes for the currently selected show
  currentView: "shows", // Tracks if we are looking at the 'shows' list or 'episodes' list
  searchTerm: "", // Global search text for shows
  episodeSearchTerm: "", // Search text for episodes
  selectedEpisodeCode: "all", // Tracks the dropdown selection (e.g., S01E05)
};

/**
 * [2] DERIVED DATA DEFINITIONS
 * These functions don't store data; they calculate it "on the fly"
 * based on what is currently in the state.
 */
const getTotalEpisodes = () => state.allEpisodes.length;
const getTotalShows = () => state.allShows.length;

/**
 * [3] SHOW FILTERING LOGIC
 * This logic looks at the 'searchTerm' and checks names, summaries, and genres.
 * It uses .toLowerCase() to make sure "Breaking" matches "breaking".
 */
const getFilteredShows = () => {
  if (!state.searchTerm) return state.allShows; // If search is empty, show everything

  const lower = state.searchTerm.toLowerCase();
  return state.allShows.filter((show) => {
    const name = (show.name || "").toLowerCase();
    const summary = stripHtml(show.summary || "").toLowerCase(); // Clean HTML before searching
    const genres = (show.genres || []).join(" ").toLowerCase();
    // Returns true if the term matches any of these three fields
    return (
      name.includes(lower) || summary.includes(lower) || genres.includes(lower)
    );
  });
};

/**
 * [4] EPISODE FILTERING LOGIC
 * Handles two types of filtering: The dropdown selector AND the text search box.
 */
const getFilteredEpisodes = () => {
  // First priority: If a specific episode is chosen in the dropdown
  if (state.selectedEpisodeCode !== "all") {
    const chosen = state.allEpisodes.find(
      (ep) =>
        formatEpisodeCode(ep.season, ep.number) === state.selectedEpisodeCode,
    );
    return chosen ? [chosen] : state.allEpisodes;
  }

  // Second priority: If text is typed into the search box
  if (!state.episodeSearchTerm) return state.allEpisodes;

  const lower = state.episodeSearchTerm.toLowerCase();
  return state.allEpisodes.filter((ep) => {
    const name = (ep.name || "").toLowerCase();
    const summary = stripHtml(ep.summary || "").toLowerCase();
    return name.includes(lower) || summary.includes(lower);
  });
};

/**
 * [5] UTILITY HELPERS
 * General purpose tools used by other functions.
 */

// Uses a "dummy" HTML element to let the browser strip out <b> or <p> tags from API strings
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// Escapes special characters (like . or ?) so they don't break the Search Regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Formats numbers into the S01E01 format using .padStart(2, "0")
function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

// Wraps matching search text in <mark> tags to highlight it yellow in the UI
function highlightText(text, term) {
  if (!term) return text;
  const escapedTerm = escapeRegExp(term);
  const regex = new RegExp(escapedTerm, "gi"); // 'gi' means Global and Case-Insensitive
  return text.replace(regex, (match) => `<mark>${match}</mark>`);
}

/**
 * [6] UI COMPONENT BUILDERS (SHOWS)
 * This function takes a show object and turns it into a piece of HTML.
 * It uses the <template> tag from the HTML file to clone a blueprint.
 */
function makePageForShow(showData, highlightTerm = "") {
  const template = document.getElementById("show-template");
  const card = template.content.cloneNode(true); // Create a fresh copy of the template

  // Fill in the title and summary with highlighted text
  card.querySelector(".episode-title").innerHTML = highlightText(
    showData.name,
    highlightTerm,
  );
  card.querySelector(".episode-summary").innerHTML =
    `<p>${highlightText(stripHtml(showData.summary || "No summary available."), highlightTerm)}</p>`;

  // Handle images: Use medium if available, otherwise original, otherwise show "No Image"
  const imageElement = card.querySelector(".episode-image");
  if (showData.image && (showData.image.medium || showData.image.original)) {
    imageElement.src = showData.image.medium || showData.image.original;
    imageElement.alt = `${showData.name} image`;
  } else {
    imageElement.removeAttribute("src");
    imageElement.alt = "No image available";
  }

  // Set text for metadata (genres, status, etc.)
  card.querySelector(".show-genres").textContent =
    showData.genres?.join(", ") || "N/A";
  card.querySelector(".show-status").textContent = showData.status || "N/A";
  card.querySelector(".show-rating").textContent =
    showData.rating?.average || "N/A";
  card.querySelector(".show-runtime").textContent = showData.runtime || "N/A";

  // Make the whole card clickable to "drill down" into episodes
  const cardElement = card.querySelector(".show-card");
  cardElement.style.cursor = "pointer";
  cardElement.addEventListener("click", () => {
    loadEpisodesForShow(showData.id, showData.name);
  });

  return card;
}

/**
 * [6.1] UI COMPONENT BUILDERS (EPISODES)
 * Similar to the show builder, but specifically for episode cards.
 */
function makePageForEpisode(episodeData, highlightTerm = "") {
  const template = document.getElementById("episode-template");
  const card = template.content.cloneNode(true);

  const code = formatEpisodeCode(episodeData.season, episodeData.number);
  const titleText = `${episodeData.name} - ${code}`;
  card.querySelector(".episode-title").innerHTML = highlightText(
    titleText,
    highlightTerm,
  );

  card.querySelector(".episode-summary").innerHTML =
    `<p>${highlightText(stripHtml(episodeData.summary || "No summary available."), highlightTerm)}</p>`;

  const imageElement = card.querySelector(".episode-image"); // ✅ Was: imgEl
  if (
    episodeData.image &&
    (episodeData.image.medium || episodeData.image.original)
  ) {
    imageElement.src = episodeData.image.medium || episodeData.image.original;
    imageElement.alt = `${episodeData.name} image`;
  } else {
    imageElement.removeAttribute("src");
    imageElement.alt = "No image available";
  }

  const linkWrapper = card.querySelector(".episode-link-wrapper");
  linkWrapper.href = episodeData.url || "#";

  const cardElement = card.querySelector(".episode-card");
  cardElement.style.cursor = "pointer";

  return card;
}

/**
 * [7] RENDER LOGIC
 * These functions actually touch the DOM (the screen) to display the lists.
 */
function renderShows() {
  const container = document.getElementById("root");
  container.innerHTML = ""; // Clear existing content
  const frag = document.createDocumentFragment(); // This is your "Invisible Tray"
  const filtered = getFilteredShows();
  for (const show of filtered) {
    // You are adding shows to the INVISIBLE tray,
    // so the browser DOES NOT have to repaint yet.
    frag.appendChild(makePageForShow(show, state.searchTerm));
  }

  // You add the whole tray to the live page.
  // The browser only has to Reflow and Repaint ONCE.
  container.appendChild(frag); // Add all shows to the page at once
  updateCountDisplay(filtered.length, getTotalShows(), true);
}

function renderEpisodes() {
  const container = document.getElementById("root");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  const filtered = getFilteredEpisodes();
  for (const ep of filtered) {
    frag.appendChild(makePageForEpisode(ep, state.episodeSearchTerm));
  }
  container.appendChild(frag);
  updateCountDisplay(filtered.length, getTotalEpisodes());
}

// Updates the episode dropdown list when a new show is loaded
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

// Updates the "Displaying X/Y shows/episodes" text
function updateCountDisplay(currentCount, total, isShows = false) {
  const elId = isShows ? "show-display-count" : "display-count";
  const el = document.getElementById(elId);
  const type = isShows ? "shows" : "episodes";
  el.textContent = `Displaying ${currentCount}/${total} ${type}`;
}

/**
 * [8] CACHING & LOCAL STORAGE
 * This section makes the app fast by saving data to the browser's hard drive
 * so we don't have to download it from the internet every time.
 */
const fetchCache = new Map(); // Fast in-memory storage for the current session
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function saveToLocalStorage(key, data) {
  try {
    const item = {
      data: data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };
    localStorage.setItem(key, JSON.stringify(item)); // Must convert objects to strings for storage
  } catch (storageError) {
    console.error("Failed to save to localStorage", storageError);
  }
}

function getFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item);

    if (Date.now() > parsed.expiresAt) {
      // Check if data is older than 24 hours
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (storageError) {
    // ✅ Specific name
    console.error("Failed to get from localStorage", storageError);
    return null;
  }
}

// Deletes any old data from LocalStorage when the app starts
function clearExpiredCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((storageKey) => {
      // ✅ Already updated
      const item = localStorage.getItem(storageKey);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            localStorage.removeItem(storageKey);
          }
        } catch (parseError) {
          // ✅ Specific name for JSON parsing
          // Not our cache item, skip it
        }
      }
    });
  } catch (cacheError) {
    // ✅ Specific name for cache operations
    console.error("Failed to clear expired cache", cacheError);
  }
}

/**
 * [9] API FETCHING
 * The core data-fetching function. It checks the Map first, then LocalStorage,
 * then finally calls the API if it has no other choice.
 */
async function fetchWithCache(url) {
  if (fetchCache.has(url)) {
    return fetchCache.get(url); // Memory check
  }

  const cachedData = getFromLocalStorage(url); // Drive check
  if (cachedData) {
    const promise = Promise.resolve(cachedData);
    fetchCache.set(url, promise);
    return promise;
  }

  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();

    saveToLocalStorage(url, data); // Save for next time

    return data;
  })();

  fetchCache.set(url, promise);
  return promise;
}

/**
 * [10] VIEW SWITCHING
 * Toggles the visibility of the search bars.
 */
function showShowsView() {
  state.currentView = "shows"; // ✅ Update state
  document.getElementById("shows-controls").style.display = "flex";
  document.getElementById("episodes-controls").style.display = "none";
}

function showEpisodesView() {
  state.currentView = "episodes"; // ✅ Update state
  document.getElementById("shows-controls").style.display = "none";
  document.getElementById("episodes-controls").style.display = "flex";
}

/**
 * [11] LOAD EPISODES (THE "DRILL DOWN")
 * Runs when a user clicks a show card.
 */
async function loadEpisodesForShow(showId, showName) {
  state.episodeSearchTerm = "";
  state.selectedEpisodeCode = "all";

  const episodesUrl = `https://api.tvmaze.com/shows/${showId}/episodes`;
  renderEpisodes(); // Show blank/loading state
  showEpisodesView(); // Swap search bars

  // Update the URL in the browser (e.g., mysite.com/#show/123)
  history.pushState(
    { view: "episodes", showId, showName },
    "",
    `#show/${showId}`,
  );

  try {
    const episodes = await fetchWithCache(episodesUrl); // ✅ Updated
    state.allEpisodes = Array.isArray(episodes) ? episodes.slice() : [];
    populateEpisodeSelector(state.allEpisodes); // Fill dropdown
    renderEpisodes(); // Draw episodes

    // Reset search UI
    const searchInput = document.getElementById("search");
    const episodeSelect = document.getElementById("episode-select");
    searchInput.value = "";
    episodeSelect.value = "all";
  } catch (fetchError) {
    console.error("Episodes load failed", fetchError);
    state.allEpisodes = [];
    renderEpisodes();
  }
}

/**
 * [12] SETUP (THE ORCHESTRATOR)
 * This function wires everything together once the page is ready.
 */
function setup() {
  // [14] Clean up old data
  clearExpiredCache();

  const searchInput = document.getElementById("search");
  const showSearchInput = document.getElementById("show-search");
  const episodeSelect = document.getElementById("episode-select");
  const backButton = document.getElementById("back-to-shows");

  // [16] Sub-function to handle initial show loading
  async function loadShows() {
    const url = "https://api.tvmaze.com/shows";
    try {
      // [18] Get data
      const shows = await fetchWithCache(url);
      // [19] Sort A-Z
      state.allShows = shows.sort((a, b) =>
        (a.name || "")
          .toLowerCase()
          .localeCompare((b.name || "").toLowerCase()),
      );
      // [20] Draw the page
      renderShows();
      showShowsView();

      if (!history.state) {
        history.replaceState({ view: "shows" }, "", "#shows");
      }
    } catch (fetchError) {
      // ✅ Specific name for fetch errors
      console.error("Shows load failed", fetchError);
    }
  }
  // [17] Define what happens when users type in search boxes
  function applyShowSearch() {
    state.searchTerm = showSearchInput.value.trim();
    renderShows();
  }

  function applyEpisodeSearch() {
    state.episodeSearchTerm = searchInput.value.trim();
    state.selectedEpisodeCode = "all";
    episodeSelect.value = "all";
    renderEpisodes();
  }

  // [21] Attach the listeners to the HTML elements
  showSearchInput.addEventListener("input", applyShowSearch);
  searchInput.addEventListener("input", applyEpisodeSearch);

  backButton.addEventListener("click", () => {
    state.searchTerm = "";
    showSearchInput.value = "";
    renderShows();
    showShowsView();
    history.pushState({ view: "shows" }, "", "#shows");
  });

  episodeSelect.addEventListener("change", (e) => {
    state.selectedEpisodeCode = e.target.value;
    state.episodeSearchTerm = "";
    searchInput.value = "";
    renderEpisodes();
  });

  // Handles the browser's Back and Forward buttons
  window.addEventListener("popstate", (event) => {
    if (event.state) {
      if (event.state.view === "shows") {
        state.searchTerm = "";
        showSearchInput.value = "";
        renderShows();
        showShowsView();
      } else if (event.state.view === "episodes") {
        loadEpisodesForShow(event.state.showId, event.state.showName);
      }
    }
  });

  // [22] KICK OFF THE APP: Start loading shows
  loadShows();
}

/**
 * [13] THE TRIGGER
 * The very first piece of code that "fires."
 * It tells the browser: "Don't do anything until the HTML is fully loaded."
 */
window.addEventListener("load", setup);

/**
 * [23] SCROLL TO TOP FEATURE
 * Independent logic for the "Back to top" button.
 */
const backToTopButton = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  // Show button only if user scrolled down 300 pixels
  if (window.pageYOffset > 300) {
    backToTopButton.classList.add("show");
  } else {
    backToTopButton.classList.remove("show");
  }
});

backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});
