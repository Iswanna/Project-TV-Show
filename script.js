//You can edit ALL of the code here

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

  // Fill the template fields
  card.querySelector(".episode-title").textContent = episodeData.name;
  card.querySelector(".episode-season").textContent = episodeData.season;
  card.querySelector(".episode-number").textContent = episodeData.number;

  // Episode code e.g., S01E01
  const code = `S${String(episodeData.season).padStart(2, "0")}E${String(
    episodeData.number,
  ).padStart(2, "0")}`;
  card.querySelector(".episode-code").textContent = code;

  // Image
  card.querySelector(".episode-image").src = episodeData.image.medium;

  // Summary (HTML included)
  card.querySelector(".episode-summary").innerHTML = episodeData.summary;

  // Attribution link
  card.querySelector(".episode-link").href = episodeData.url;

  return card;
}

function setup() {
  const episodes = state.films;
  const container = document.getElementById("root");
  const countElement = document.getElementById("episode-count");

  const episodesToRender = episodes.map(makePageForEpisode);

  container.append(...episodesToRender);

  // Update the episode count
  countElement.textContent = `Showing ${episodes.length} episodes`;
}

// Once episode data is fetched asynchronously, update state and trigger UI rendering
// The .then() method is attached to the Promise returned by fetchFilms().
// .then() is used to specify what should happen after the Promise resolves (that is, after the data is fetched from the API).
fetchFilms().then(function (films) {
  state.films = films;
  setup();
});
