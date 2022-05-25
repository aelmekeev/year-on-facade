function updateHeader(city, year) {
  const title = [year, city, data.config.country].filter(n => n).join(", ");
  document.querySelector("h1").innerHTML = title;
}

function updateLinks(city, year) {
  const currentLocation = window.location;

  const map = document.querySelector("#map a")
  map.href = data.config.useInternalMap ?
    currentLocation.href.replace("/item", "/map") :
    `https://www.google.com/maps/search/${data.points[year].latlng.lat},${data.points[year].latlng.lng}`;

  const more = document.querySelector("#more a")
  more.href = `${currentLocation.origin}${currentLocation.pathname.replace("/item", "/stats")}?city=${city}`
}

function updateExternalLink(year) {
  const externalId = data.points[year].external
  if (data.config.external && externalId) {
    const link = document.querySelector("#external a")
    link.innerHTML = data.config.external.label
    link.href = data.config.external.template.replace("EXTERNAL_ID", externalId)
  }
}

function updateNotes(year) {
  const notes = data.points[year].notes
  if (notes) {
    const notesContainer = document.querySelector("#notes")
    notesContainer.innerHTML = data.points[year].notes
  }
}

function addPhoto(container, url) {
  const photo = document.createElement('object')
  photo.data = url
  photo.type = 'image/jpeg'
  container.appendChild(photo)
}

function addPhotos(city, year) {
  if (data.config.photosBaseUrl) {
    const photoContainer = document.querySelector('#photoContainer')
    addPhoto(photoContainer, `${data.config.photosBaseUrl}/${city}/${year}_close.jpg`)
    addPhoto(photoContainer, `${data.config.photosBaseUrl}/${city}/${year}.jpg`)
  }
}

function updateItem() {
  const url = new URL(window.location.href);
  const year = url.searchParams.get("year");
  const city = url.searchParams.get("city") || "London";

  updateHeader(city, year)
  updateLinks(city, year)
  updateExternalLink(year)
  updateNotes(year)
  addPhotos(city, year)
}

window.onload = updateItem