// Ignore replacements in stats
points = structuredClone(data.points)
for (let k of Object.keys(points)) {
  if (k.length != 4) delete points[k]
}

const years = Object.keys(points).map(y => parseInt(y))

function updateHeader() {
  const url = new URL(window.location.href)
  const city = url.searchParams.get('city')
  const title = [city.replaceAll('_', ' '), data.config.country].filter(n => n).join(', ')
  document.querySelector('h1').innerHTML = title
}

const maybePluralize = (count, noun = 'year', suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`

function updateRange() {
  const min = Math.min(...years)
  const max = Math.max(...years)
  document.querySelector('#range .value').innerHTML = `${min} &mdash; ${max} (${maybePluralize(max - min + 1)})`
}

function redirectToExactPoint(year) {
  return function () {
    const currentUrl = window.location.href
    window.location.href = `${currentUrl.replace('/stats', '/item')}&year=${year}`
  }
}

function updateTable() {
  const yearsInLine = 10

  const min = Math.floor(Math.min(...years) / yearsInLine) * yearsInLine
  let max = Math.ceil((Math.max(...years) + 1) / yearsInLine) * yearsInLine

  const parent = document.querySelector('#table')

  let lastIsDotRow = false

  for (let r = min / yearsInLine; r < max / yearsInLine; r++) {
    let isDotRow = true

    const row = document.createElement('div')
    row.classList.add('row')
    for (let c = 0; c < yearsInLine; c++) {
      const year = document.createElement('div')
      year.classList.add('year')
      const currentYear = r * yearsInLine + c
      if (years.includes(currentYear)) {
        isDotRow = false
        year.classList.add('found')
        year.onclick = redirectToExactPoint(currentYear)
        if (points[currentYear].external) {
          year.classList.add('external')
        }
      }
      if (c == 0 || c % 5 == 0) {
        year.innerText = currentYear
      }
      year.title = currentYear
      row.appendChild(year)
    }

    if (isDotRow) {
      if (!lastIsDotRow) {
        const dotRow = document.createElement('div')
        dotRow.classList.add('row')
        dotRow.innerText = '...'
        parent.appendChild(dotRow)
        lastIsDotRow = true
      }
    } else {
      parent.appendChild(row)
      lastIsDotRow = false
    }
  }
}

function updateTotal() {
  const min = Math.min(...years)
  const max = Math.max(...years)
  const coverage = Math.floor((years.length * 100) / (max - min + 1))
  document.querySelector('#total .value').innerHTML = `${years.length} (${coverage}%)`
}

function updateLongestSequence() {
  const sequence = years.reduce(
    ([max, current, sequenceStart], year, i) => {
      const partOfSequence = (year - years[i - 1] || 0) == 1
      current = partOfSequence ? ++current : 0
      sequenceStart = current > max ? year - current : sequenceStart
      return [Math.max(max, current), current, sequenceStart]
    },
    [0, 0, years[0]]
  )
  const sequenceStart = sequence[2]
  const sequenceLength = sequence[0] + 1
  const sequenceEnd = sequenceStart + sequenceLength - 1
  document.querySelector('#sequence .value').innerHTML = `${sequenceStart} &mdash; ${sequenceEnd} (${maybePluralize(
    sequenceLength
  )})`
}

function updateHeritageRegistry() {
  const inRegistry = Object.values(points).filter(p => p.external).length
  if (inRegistry > 0) {
    const percentage = Math.floor((inRegistry * 100) / Object.keys(points).length)
    document.querySelector('#registry .value').innerHTML = `${inRegistry} (${percentage}%)`
  } else {
    document.querySelector('#registry').remove()
  }
}

function updateVisited() {
  const todo = Object.values(points).filter(p => p.notes.includes('TODO')).length || 0
  const total = Object.keys(points).length
  const visited = total - todo
  const percentage = Math.floor((visited * 100) / total)
  document.querySelector('#visited .value').innerHTML = `${visited} (${percentage}%)`
}

function updateLinks() {
  document.querySelector('#compare a').href = `${window.location.href.replace('stats/', '').replace(/\?.+/, '')}${
    data.config.country ? `?country=${data.config.country}` : ''
  }`
  const map = document.querySelector('#map a')
  if (data.config.useInternalMap) {
    map.href = window.location.href.replace('stats/', 'map/')
  } else {
    map.remove()
  }
}

function generateNotFoundPage() {
  const body = document.querySelector('body')
  body.innerHTML = ''

  const header = document.createElement('h1')
  header.innerText = `No items in the collection for ${city}`

  const wrapper = document.createElement('div')
  wrapper.classList.add('stat')

  const link = document.createElement('a')
  link.href = window.location.href.replace('stats/', '').replace(/\?.+/, '')
  link.innerText = 'See all the cities in the collection'

  body.appendChild(header)

  wrapper.appendChild(link)
  body.appendChild(wrapper)
}

function updateStats() {
  if (typeof data == 'undefined') {
    generateNotFoundPage()
    return
  }

  updateHeader()
  updateRange()
  updateTotal()
  updateLongestSequence()
  updateHeritageRegistry()
  updateVisited()
  updateLinks()
  updateTable()
}

window.onload = updateStats
