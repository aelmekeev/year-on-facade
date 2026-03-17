const country = new URL(window.location.href).searchParams.get('country')
const year = new URL(window.location.href).searchParams.get('year')
const minYear = data.find(c => c.name == (country ? country : 'World')).minYear

const updateHeader = () => {
  const h1 = document.querySelector('h1')

  // on click go to home page
  h1.style.cursor = 'pointer'
  h1.onclick = () => {
    window.location.href = `${window.location.origin}${window.location.pathname.replace('/stats', '').replace('/item', '')}`
  }
}

const sortByCount = (a, b) => {
  if (a.country == 'null' && b.country != 'null') {
    return -1
  } else {
    return b.count - a.count
  }
}

const sortAlphabetically = (a, b) => {
  if (!country || country == 'World') {
    return a.name == 'World' ? -1 : a.name.localeCompare(b.name)
  } else {
    return a.country == 'null' ? -1 : a.name.localeCompare(b.name)
  }
}

function addTimeline(list) {
  const timeline = document.createElement('div')
  timeline.id = 'timeline'

  const currentYear = new Date().getFullYear()
  const range = currentYear - minYear
  let start = minYear
  let end = start
  while (start + 100 < currentYear) {
    end = Math.floor((start + 100) / 100) * 100
    length = ((end - start) * 100) / range
    const century = document.createElement('div')
    century.style.width = `${length}%`
    timeline.appendChild(century)
    start = end
  }

  list.appendChild(timeline)
}

function sortList(sortFunction = sortByCount) {
  const parent = document.querySelector('#list')
  parent.innerHTML = ''

  addTimeline(parent)

  data
    .filter(
      e =>
        (!country && e.country == 'null') ||
        (country != 'World' && (e.country == country || e.name == country)) ||
        (country == 'World' && e.country != 'null'),
    )
    .sort(sortFunction)
    .forEach(e => {
      const title = e.name.replaceAll('_', ' ')
      const city = e.name.split(',')[0]
      const score = e.count

      const row = document.createElement('div')
      row.classList.add('row')

      const statsUrl = `${window.location.href
        .replace(/\?.+/, '')
        .replace(/(year-on-facade[^//]*)/, '$1/stats')}?city=${city}`
      const listUrl = `${window.location.href}${window.location.href.includes('?') ? '&' : '?'}country=${e.name}`

      const rowUrl = country || title == 'World' ? statsUrl : listUrl
      // Wraps the text in a span to apply the background pill styling
      row.innerHTML = `<span class="row-label"><a href="${rowUrl}">${title}</a> - ${score}</span>`
      row.style.backgroundImage = `url("img/_generated/${!country || country == 'World' ? city : 'country_' + city}.svg")`

      row.onclick = event => {
        if (event.target.tagName.toLowerCase() !== 'a') {
          window.location.href = rowUrl
        }
      }

      parent.appendChild(row)
    })
}

function sortListByYear() {
  const parent = document.querySelector('#list')
  parent.innerHTML = ''

  addTimeline(parent)

  document.querySelector('#sort').style.display = 'none'

  const cities = yearsData[year] || []
  cities
    .sort((a, b) => a.localeCompare(b))
    .forEach(city => {
      const title = city.replaceAll('_', ' ')

      const row = document.createElement('div')
      row.classList.add('row')

      const rowUrl = `${window.location.href
        .replace(/\?.+/, '')
        .replace(/(year-on-facade[^//]*)/, '$1/item')}?city=${city}&year=${year}`

      // Wraps the text in a span to apply the background pill styling
      row.innerHTML = `<span class="row-label"><a href="${rowUrl}">${title}</a></span>`
      row.style.backgroundImage = `url("img/_generated/${city}.svg")`

      row.onclick = event => {
        if (event.target.tagName.toLowerCase() !== 'a') {
          window.location.href = rowUrl
        }
      }

      parent.appendChild(row)
    })
}

function sortListListener(sortBy) {
  const sortFunction = sortBy == 'by_count' ? sortByCount : sortAlphabetically

  return function () {
    sortList(sortFunction)
  }
}

function updateMarks() {
  document.querySelector('#start').innerText = minYear
  document.querySelector('#end').innerText = new Date().getFullYear()
}

function setupYearSearch() {
  const searchInput = document.querySelector('#year-search')
  const searchBtn = document.querySelector('#year-search-btn')

  const performSearch = () => {
    const searchYear = searchInput.value
    if (searchYear && yearsData && yearsData[searchYear]) {
      const url = new URL(window.location.href)
      url.searchParams.delete('country') // Prevent combining filters
      url.searchParams.set('year', searchYear)
      window.location.href = url.toString()
    } else if (searchYear) {
      alert(`Year ${searchYear} not found in collection.`)
    }
  }

  searchBtn.addEventListener('click', performSearch)
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') performSearch()
  })
}

function updateList() {
  if (year) {
    sortListByYear()
  } else {
    sortList()
    document.querySelectorAll('[name=sort]').forEach(r => (r.onclick = sortListListener(r.value)))
  }
  updateMarks()
}

function addOtherCountriesLink() {
  const container = document.createElement('p')
  container.innerHTML = `<a href="${window.location.href.replace(/\?.+/, '')}">Checkout all countries</a>`
  document.body.querySelector('main').insertBefore(container, document.querySelector('#controls'))
}

function hideSearchControls() {
  document.querySelector('#search-container').style.display = 'none'
}

window.onload = () => {
  if (year) {
    document.querySelector('h1').innerHTML = `Year on Facade (${year})`
  } else if (country && country != 'World') {
    document.querySelector('h1').innerHTML = `Year on Facade (${country})`
  }

  if (country || year) {
    addOtherCountriesLink()
    hideSearchControls()
  }
  updateHeader()
  setupYearSearch()
  updateList()
}
