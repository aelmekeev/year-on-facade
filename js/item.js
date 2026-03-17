// --- Architectural Color Gradient Logic ---
const CENTURY_COLORS = {
  1500: [194, 89, 83],   // Tudor Brick
  1600: [224, 130, 75],  // Amber Terracotta
  1700: [232, 196, 79],  // Sandstone Gold
  1800: [152, 201, 87],  // Victorian Garden
  1900: [75, 179, 169],  // Industrial Patina
  2000: [78, 140, 230],  // Modern Glass
  2100: [155, 93, 230]   // Future Steel
};

function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function getYearColor(year) {
  year = Math.max(1500, Math.min(2100, year));
  const centuryStart = Math.floor(year / 100) * 100;
  const centuryEnd = centuryStart + 100;

  if (centuryStart >= 2100) {
      return rgbToHex(...CENTURY_COLORS[2100]);
  }

  const c1 = CENTURY_COLORS[centuryStart];
  const c2 = CENTURY_COLORS[centuryEnd];

  const factor = (year - centuryStart) / 100.0;
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);

  return rgbToHex(r, g, b);
}
// ------------------------------------------

function updateHeader(city, year) {
  const title = [year, city.replaceAll('_', ' '), data.config.country].filter(n => n).join(', ')
  
  const h1 = document.querySelector('h1')
  // Wrap the text in our readable pill span
  h1.innerHTML = `<span class="header-label">${title}</span>`
  
  const imgPrefix = (!data.config.country || data.config.country == 'World') ? '' : 'country_'
  h1.style.backgroundImage = `url("../img/_generated/${imgPrefix}${city}.svg")`

  titleContainer = document.querySelector('.header-label')
  titleContainer.style.backgroundColor = getYearColor(parseInt(year))
}

function updateNavigation(city, currentYearStr) {
  const currentYear = parseInt(currentYearStr);
  
  // Extract all valid years, sort chronologically
  const availableYears = Object.keys(data.points)
    .map(Number)
    .filter(y => !isNaN(y))
    .sort((a, b) => a - b);

  const currentIndex = availableYears.indexOf(currentYear);
  
  const prevLink = document.getElementById('prev-link');
  const nextLink = document.getElementById('next-link');

  const currentLocation = window.location;
  const baseUrl = `${currentLocation.origin}${currentLocation.pathname}`;

  console.log('Available years:', availableYears);
  console.log('Current year:', currentYear, 'at index:', currentIndex);

  // Process Previous Button
  if (currentIndex > 0) {
    const prevYear = availableYears[currentIndex - 1];
    prevLink.href = `${baseUrl}?city=${city}&year=${prevYear}`;
    prevLink.innerHTML = `&larr; Previous (${prevYear})`;
    prevLink.style.visibility = 'visible';
    prevLink.style.backgroundColor = getYearColor(prevYear);
  } else {
    prevLink.style.visibility = 'hidden'; // Hidden keeps layout structure intact
  }

  // Process Next Button
  if (currentIndex !== -1 && currentIndex < availableYears.length - 1) {
    const nextYear = availableYears[currentIndex + 1];
    nextLink.href = `${baseUrl}?city=${city}&year=${nextYear}`;
    nextLink.innerHTML = `Next (${nextYear}) &rarr;`;
    nextLink.style.visibility = 'visible';
    nextLink.style.backgroundColor = getYearColor(nextYear);
  } else {
    nextLink.style.visibility = 'hidden';
  }

  if (availableYears.length === 1) {
    prevLink.style.display = 'none';
    nextLink.style.display = 'none';
  }
}

function updateLinks(city, year) {
  const currentLocation = window.location

  const coordinates = `${data.points[year].latlng.lat},${data.points[year].latlng.lng}`
  const map = document.querySelector('#map')
  map.href = data.config.useInternalMap
    ? currentLocation.href.replace('/item', '/map')
    : `https://www.google.com/maps/search/${coordinates}`

  const streetview = document.querySelector('#streetview')
  streetview.href = `https://www.google.com/maps?q=&layer=c&cbll=${coordinates}&cbp=12,0,0,0,-15`

  const more = document.querySelector('#more')
  const statsUrl = `${currentLocation.origin}${currentLocation.pathname.replace('/item', '/stats')}`
  more.href = `${statsUrl}?city=${city}`

  const moreYear = document.querySelector('#more-year')
  const indexUrl = `${currentLocation.origin}${currentLocation.pathname.replace('/item', '')}`
  moreYear.href = `${indexUrl}?year=${year}`

  // handle Back to World view link
  const url = new URL(currentLocation.href)
  if (url.searchParams.get('city') == 'World') {
    document.querySelector('#back a').href = `${statsUrl}?city=World`
  } else {
    document.querySelector('#back').remove()
  }
}

function updateExternalLink(city, year) {
  const externalId = data.points[year].external
  const externalConfig = data.config.external || (data.citiesConfig && data.citiesConfig[city].config.external)
  if (externalConfig && externalId) {
    const link = document.querySelector('#external a')
    link.innerHTML = externalConfig.label
    const template = externalConfig.template
    link.href = template.replace('EXTERNAL_ID', externalId)
  }
}

function updateNotes(year) {
  const notes = data.points[year].notes
  if (notes) {
    const notesContainer = document.querySelector('#notes')
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
  if (data.config.photosBaseUrl && city != 'Replacements') {
    const photoContainer = document.querySelector('#photoContainer')
    addPhoto(photoContainer, `${data.config.photosBaseUrl}/${city}/${year}_close.jpg`)
    addPhoto(photoContainer, `${data.config.photosBaseUrl}/${city}/${year}.jpg`)
  }
}

function generateNotFoundPage(year, city) {
  const body = document.querySelector('body')
  body.innerHTML = ''

  const header = document.createElement('h1')
  header.innerText = `No year ${year} in the ${city} collection`

  const wrapper = document.createElement('div')
  wrapper.classList.add('stat')

  const link = document.createElement('a')
  const currentLocation = window.location
  link.href = `${currentLocation.origin}${currentLocation.pathname.replace('/item', '/stats')}?city=${city}`
  link.innerText = `All the items in the ${city} collection`

  body.appendChild(header)
  wrapper.appendChild(link)
  body.appendChild(wrapper)
}

function updateItem() {
  const url = new URL(window.location.href)
  const year = url.searchParams.get('year')
  const paramCity = url.searchParams.get('city')

  if (typeof data == 'undefined' || !data.points[year]) {
    generateNotFoundPage(year, paramCity)
    return
  }

  const city = data.points[year].city || paramCity

  updateHeader(city, year)
  updateNavigation(city, year)
  updateLinks(city, year)
  updateExternalLink(city, year)
  updateNotes(year)
  if (!data.points[year].notes.startsWith('TODO')) {
    addPhotos(city, year)
  }
}

window.onload = updateItem