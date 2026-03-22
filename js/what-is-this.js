const updateHeader = () => {
  const h1 = document.querySelector('h1')

  // on click go to home page
  h1.style.cursor = 'pointer'
  h1.onclick = () => {
    window.location.href = `${window.location.origin}${window.location.pathname.replace('/what-is-this', '')}`
  }
}

window.onload = () => {
  updateHeader()
}
