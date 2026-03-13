// --- Architectural Color Gradient Logic ---
const CENTURY_COLORS = {
  1500: [194, 89, 83], // Tudor Brick
  1600: [224, 130, 75], // Amber Terracotta
  1700: [232, 196, 79], // Sandstone Gold
  1800: [152, 201, 87], // Victorian Garden
  1900: [75, 179, 169], // Industrial Patina
  2000: [78, 140, 230], // Modern Glass
  2100: [155, 93, 230], // Future Steel
}

function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

function getYearColor(year) {
  year = Math.max(1500, Math.min(2100, year))
  const centuryStart = Math.floor(year / 100) * 100
  const centuryEnd = centuryStart + 100

  if (centuryStart >= 2100) {
    return rgbToHex(...CENTURY_COLORS[2100])
  }

  const c1 = CENTURY_COLORS[centuryStart]
  const c2 = CENTURY_COLORS[centuryEnd]

  const factor = (year - centuryStart) / 100.0
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor)
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor)
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor)

  return rgbToHex(r, g, b)
}
// ------------------------------------------

function StatsControl(controlDiv) {
  controlDiv.classList.add('control')

  const controlUI = document.createElement('div')
  controlUI.classList.add('control-ui')
  controlUI.title = 'Click to open the statistics'
  controlDiv.appendChild(controlUI)

  const controlText = document.createElement('div')
  controlText.classList.add('control-text')
  controlText.innerHTML = 'Statistics'
  controlUI.appendChild(controlText)

  controlUI.addEventListener('click', () => {
    const currentUrl = window.location.href
    window.location.href = currentUrl.replace('/map/', '/stats/').replace(/&year=\d+_?/g, '')
  })
}

function TodoFilterControl(controlDiv) {
  controlDiv.classList.add('control')
  controlDiv.classList.add('filter-checkbox')

  const controlUI = document.createElement('input')
  controlUI.id = 'todo-filter-checkbox'
  controlUI.type = 'checkbox'
  controlUI.title = 'Check to show only points with the comment starting with TODO'
  controlDiv.appendChild(controlUI)

  const controlText = document.createElement('label')
  controlText.htmlFor = 'todo-filter-checkbox'
  controlText.classList.add('control-text')
  controlText.innerText = 'TODO only'
  controlDiv.appendChild(controlText)

  controlUI.addEventListener('change', event => {
    toggleTODOMarkers(event.target.checked)
  })
}

// NEW: Mobile-first Geolocation Control
function CurrentLocationControl(controlDiv, map) {
  controlDiv.classList.add('control')

  const controlUI = document.createElement('div')
  controlUI.classList.add('control-ui')
  controlUI.classList.add('round')
  controlUI.title = 'Click to find your current location'
  controlDiv.appendChild(controlUI)

  const controlText = document.createElement('div')
  controlText.classList.add('control-text')
  // Using an emoji as a lightweight icon instead of loading an image asset
  controlText.innerHTML = '📍'
  controlUI.appendChild(controlText)

  controlUI.addEventListener('click', () => {
    if (navigator.geolocation) {
      controlText.innerHTML = '⏳'
      navigator.geolocation.getCurrentPosition(
        position => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          map.setCenter(pos)
          map.setZoom(15) // Zoom in close enough to see the street level
          controlText.innerHTML = '📍'
        },
        () => {
          alert('Error: The Geolocation service failed or permission was denied.')
          controlText.innerHTML = '📍'
        },
        // enableHighAccuracy is essential for cycling and precise hunting
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
    } else {
      alert("Error: Your browser doesn't support geolocation.")
    }
  })
}

var start, end, lastClicked
let map
let markers = {}

function toggleTODOMarkers(showOnlyTODO) {
  for (const year in markers) {
    const marker = markers[year]
    whenOnlyTODO = showOnlyTODO && (marker.todo || marker.replacement)
    whenNotOnlyTODO = !showOnlyTODO && !marker.replacement
    marker.mapMarker.setMap(whenNotOnlyTODO || whenOnlyTODO ? map : null)
  }
}

function setCenter(map, year) {
  var center = { lat: 0, lng: 0 }
  if (year && data.points[year]) {
    center = data.points[year].latlng
  } else if (data.config.borders) {
    center = {
      lat: (data.config.borders.north + data.config.borders.south) / 2,
      lng: (data.config.borders.east + data.config.borders.west) / 2,
    }
  }
  map.setCenter(center)
}

function setZoom(map, year) {
  if (year) {
    map.setZoom(18)
  } else if (!data.config.borders) {
    map.setZoom(2)
  } else {
    map.fitBounds(data.config.borders)
  }
}

async function initMap() {
  const url = new URL(window.location.href)
  const year = url.searchParams.get('year')
  const points = data.points

  const { Map } = await google.maps.importLibrary('maps')
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker')

  map = new Map(document.getElementById('map'), {
    clickableIcons: false,
    fullscreenControl: false,
    cameraControl: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
    },
    restriction: data.config.borders
      ? {
          latLngBounds: data.config.borders,
        }
      : null,
    mapId: '58733f12c8d8eb66', // https://console.cloud.google.com/google/maps-apis/studio/maps?project=year-on-facade
  })

  setCenter(map, year)
  setZoom(map, year)

  const statsControlDiv = document.createElement('div')
  StatsControl(statsControlDiv)
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(statsControlDiv)

  if (Object.values(points).some(p => p.notes.startsWith('TODO'))) {
    const todoFilterControlDiv = document.createElement('div')
    TodoFilterControl(todoFilterControlDiv)
    map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(todoFilterControlDiv)
  }

  // Inject the new Geolocation Control
  const locationControlDiv = document.createElement('div')
  CurrentLocationControl(locationControlDiv, map)
  // Placing on RIGHT_BOTTOM for easier thumb access on mobile
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationControlDiv)

  for (const year in points) {
    const title = year.slice(0, 4)

    const yearMarker = document.createElement('div')
    yearMarker.className = 'year-marker'
    yearMarker.textContent = title

    // 1. Calculate the dynamic color once
    const dynamicColor = getYearColor(parseInt(title, 10))

    // 2. Apply it to the main background
    yearMarker.style.backgroundColor = dynamicColor

    // 3. Set the CSS custom property for the ::after pseudo-element to pick up!
    yearMarker.style.setProperty('--marker-color', dynamicColor)

    yearMarker.style.color = '#ffffff'
    yearMarker.style.textShadow = '0px 1px 2px rgba(0,0,0,0.5)'

    const marker = new AdvancedMarkerElement({
      position: points[year].latlng,
      map: year.length == 4 ? map : null, // hide replacement initially
      title,
      content: yearMarker,
    })
    marker.addListener('click', () => {
      if (lastClicked == year) {
        const currentUrl = window.location.href
        window.location.assign(
          `${currentUrl.replace('/map', '/item').replace(/[\?&]year=\d+_?/, '')}&year=${marker.title}`,
        )
      } else {
        map.setZoom(15)
        map.setCenter(marker.position)
        lastClicked = year
      }
    })
    markers[year] = {
      mapMarker: marker,
      todo: points[year].notes.startsWith('TODO'),
      replacement: year.length != 4,
    }
  }
}

initMap()
