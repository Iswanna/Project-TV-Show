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
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(
    2,
    "0"
  )}`;
}

// Wrap matches with <mark>, safe for plain text input
function highlightText(text, term) {
  if (!term) return text;
  const esc = escapeRegExp(term);
  const re = new RegExp(esc, "gi");
  return text.replace(re, (match) => `<mark>${match}</mark>`);
}

// Declaring global variable
const state = {
  films: [],
  searchTerm: "",
};

// Store the API endpoint for episodes in a variable
const endpoint = "https://api.tvmaze.com/shows/82/episodes";

// This statement fetches episode data from the TVMaze API endpoint and returns it as a JSON array
const fetchFilms = async () => {
  const response = await fetch(endpoint);
  return await response.json();
};

// declare a funcion and define it
function makePageForEpisode(episodeData) {
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

function renderEpisodes() {
  const episodes = state.films;
  const container = document.getElementById("root");
  const countElement = document.getElementById("episode-count");

  const episodesToRender = episodes.map(makePageForEpisode);

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
}

// Once episode data is fetched asynchronously, update state and trigger UI rendering
// The .then() method is attached to the Promise returned by fetchFilms().
// .then() is used to specify what should happen after the Promise resolves (that is, after the data is fetched from the API).
fetchFilms().then(function (films) {
  state.films = films;
  renderEpisodes();
});
