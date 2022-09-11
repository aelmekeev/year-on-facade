const country = new URL(window.location.href).searchParams.get('country')
const minYear = data.find(c => c.name == (country ? country : 'World')).minYear

const sortByCount = (a, b) => b.count - a.count
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
        (country == 'World' && e.country != 'null')
    )
    .sort(sortFunction)
    .forEach(e => {
      const title = e.name.replaceAll('_', ' ')
      const city = e.name.split(',')[0]
      const score = e.count

      const row = document.createElement('div')
      row.classList.add('row')

      const statsLink = `<a href="${window.location.href
        .replace(/\?.+/, '')
        .replace(/(year-on-facade[^//]*)/, '$1/stats')}?city=${city}">${title}</a>`
      const citiesLink =
        !country && e.country == 'null'
          ? ` (<a href="${window.location.href}?country=${e.name}">cities</a>)`
          : ''
      row.innerHTML = `${statsLink}${citiesLink} - ${score}`

      row.style.backgroundImage = `url("img/_generated/${(!country || country == 'World') ? city : 'country_' + city}.svg")`
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

function updateList() {
  sortList()
  document.querySelectorAll('[name=sort]').forEach(r => (r.onclick = sortListListener(r.value)))
  updateMarks()
}

function addOtherCountriesLink() {
  const container = document.createElement('p')
  container.innerHTML = `<a href="${window.location.href.replace(/\?.+/, '')}">Checkout all countries</a>`
  document.body.insertBefore(container, document.querySelector('div#sort'))
}

window.onload = () => {
  if (country && country != 'World') document.querySelector('h1').innerHTML = `Year on Facade (${country})`
  if (country) addOtherCountriesLink()
  updateList()
}
