const sortByCount = ([, a], [, b]) => b - a
const sortAlphabetically = ([a], [b]) => b < a

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

  Object.entries(data)
    .sort(sortFunction)
    .forEach(e => {
      const title = e[0].replaceAll('_', ' ')
      const city = e[0].split(',')[0]
      const score = e[1]

      const row = document.createElement('div')
      row.classList.add('row')
      row.innerHTML = `<a href="${window.location.href.replace(
        /(year-on-facade[^//]*)/,
        '$1/stats'
      )}?city=${city}">${title}</a> - ${score}`
      row.style.backgroundImage = `url("img/_generated/${city}.svg")`
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

window.onload = () => updateList()
