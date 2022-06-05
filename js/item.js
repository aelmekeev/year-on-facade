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
  const statsUrl = `${currentLocation.origin}${currentLocation.pathname.replace("/item", "/stats")}`
  more.href = `${statsUrl}?city=${city}`

  // handle Back to World view link
  const url = new URL(currentLocation.href)
  if (url.searchParams.get("city") == "World") {
    document.querySelector("#back a").href = `${statsUrl}?city=World`
  } else {
    document.querySelector("#back").remove()
  }
}

function updateExternalLink(city, year) {
  const externalId = data.points[year].external
  const externalConfig = data.config.external || data.citiesConfig && data.citiesConfig[city].config.external
  if (externalConfig && externalId) {
    const link = document.querySelector("#external a")
    link.innerHTML = externalConfig.label
    const template = externalConfig.template
    link.href = template.replace("EXTERNAL_ID", externalId)
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
  if (data.config.photosBaseUrl && city != "TODO") {
    const photoContainer = document.querySelector('#photoContainer')
    addPhoto(photoContainer, `${data.config.photosBaseUrl}/${city}/${year}_close.jpg`)
    addPhoto(photoContainer, `${data.config.photosBaseUrl}/${city}/${year}.jpg`)
  }
}

function updateItem() {
  const url = new URL(window.location.href);
  const year = url.searchParams.get("year");
  const city = data.points[year].city || url.searchParams.get("city");

  updateHeader(city, year)
  updateLinks(city, year)
  updateExternalLink(city, year)
  updateNotes(year)
  addPhotos(city, year)
}

window.onload = updateItem