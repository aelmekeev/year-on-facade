const updateHeader = () => {
  const h1 = document.querySelector('h1')

  // on click go to home page
  h1.style.cursor = 'pointer'
  h1.onclick = () => {
    window.location.href = `${window.location.origin}${window.location.pathname.replace('/routes', '')}`
  }
}

function updateList() {
  const parent = document.querySelector('#routes')
  parent.innerHTML = ''

  data
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach(r => {
      const row = document.createElement('li')

      const id = r.id
      const name = r.name
      const count = r.count

      const routeLink = `<a href="${window.location.href
        .replace(/\?.+/, '')
        .replace(/routes/, 'route')}?city=${id}">${name} (${count})</a>`

      row.innerHTML = `${routeLink}`

      parent.appendChild(row)
    })
}

window.onload = () => {
  updateHeader()
  updateList()
}
