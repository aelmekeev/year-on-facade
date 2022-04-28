const sortByCount = ([, a], [, b]) => b - a;
const sortAlphabetically = ([a,], [b,]) => b < a;

function sortList(sortFunction = sortByCount) {
  const parent = document.querySelector("#list");
  parent.innerHTML = "";

  Object.entries(data)
    .sort(sortFunction)
    .forEach(e => {
      const city = e[0];
      const score = e[1];

      const row = document.createElement('div');
      row.classList.add('row');
      row.innerHTML = `<a href="${window.location.href.replace('/year-on-facade', '/year-on-facade/map')}?city=${city}">${city}</a> &mdash; ${score}`;
      row.style.backgroundImage = `url("svg/_generated/${city}.svg")`;
      parent.appendChild(row);
    });
}

function sortListListener(sortBy) {
  const sortFunction = sortBy == "by_count" ? sortByCount : sortAlphabetically;

  return function () {
    sortList(sortFunction);
  }
}

function updateList() {
  sortList();
  document.querySelectorAll("[name=sort]")
    .forEach(r => r.onclick = sortListListener(r.value));
}

window.onload = () => updateList()