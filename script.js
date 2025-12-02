//You can edit ALL of the code here

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
  const episodesToRender = [];
  const episodes = getAllEpisodes();
  const container = document.getElementById("root");
  for (const episode of episodes) {
    const episodeCard = makePageForEpisode(episode);
    episodesToRender.push(episodeCard);
  }

  container.append(...episodesToRender);
}

// When the whole page finishes loading, run the function called setup.
window.onload = setup;
