function updateList() {
  const parent = document.querySelector('#routes')
  parent.innerHTML = ''

  data
    .sort((a, b) => a.localeCompare(b))
    .forEach(r => {
      const row = document.createElement('li')
      row.classList.add('row')

      const routeLink = `<a href="${window.location.href
        .replace(/\?.+/, '')
        .replace(/routes/, 'route')}?city=${r}">${r}</a>`

      row.innerHTML = `${routeLink}`

      parent.appendChild(row)
    })
}

window.onload = () => {
  updateList()
}
