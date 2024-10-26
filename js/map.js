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

  const { Map } = await google.maps.importLibrary("maps");
  const {AdvancedMarkerElement} = await google.maps.importLibrary("marker")

  map = new Map(document.getElementById('map'), {
    clickableIcons: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
    },
    restriction: data.config.borders ? {
      latLngBounds: data.config.borders,
    } : null,
    mapId: '58733f12c8d8eb66' // https://console.cloud.google.com/google/maps-apis/studio/maps?project=year-on-facade
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

  for (const year in points) {
    const title = year.slice(0, 4)

    const yearMarker = document.createElement('div')
    yearMarker.className = 'year-marker'
    yearMarker.textContent = title

    const marker = new AdvancedMarkerElement({
      position: points[year].latlng,
      map: year.length == 4 ? map : null, // hide replacement initially
      title,
      content: yearMarker,
    })
    marker.addListener('click', () => {
      if (lastClicked == year) {
        const currentUrl = window.location.href
        window.location.assign(`${currentUrl
          .replace('/map', '/item')
          .replace(/[\?&]year=\d+_?/, '')}&year=${marker.title}`)
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