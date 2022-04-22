function updateHeader() {
  const url = new URL(window.location.href);
  document.querySelector("h1").innerHTML = url.searchParams.get("city") || "London";
}

function updateRange() {
  const years = Object.keys(data.points).map(y => parseInt(y));
  const min = Math.min(...years);
  const max = Math.max(...years);
  document.querySelector("#range .value").innerHTML = `${min} &mdash; ${max} (${max - min} years)`;
}

function redirectToExactPoint(year) {
  return function () {
    const currentUrl = window.location.href;
    window.location.href = currentUrl.replace("/stats", "") + (currentUrl.includes("?") ? "&" : "?") + "year=" + year;
  }
}

function updateTable() {
  const yearsInLine = 10

  const years = Object.keys(data.points).map(y => parseInt(y));
  const min = Math.floor(Math.min(...years) / yearsInLine) * yearsInLine;
  const max = Math.ceil(Math.max(...years) / yearsInLine) * yearsInLine;

  const parent = document.querySelector("#table");

  for (let r = min / yearsInLine; r < max / yearsInLine; r++) {
    const row = document.createElement('div');
    row.classList.add('row');
    for (let c = 0; c < yearsInLine; c++) {
      const year = document.createElement('div');
      year.classList.add('year');
      const currentYear = r * yearsInLine + c;
      if (years.includes(currentYear)) {
        year.classList.add('found');
        year.onclick = redirectToExactPoint(currentYear);
      }
      if (c == 0 || c % 5 == 0) {
        year.innerText = currentYear;
      }
      year.title = currentYear;
      row.appendChild(year);
    }
    parent.appendChild(row);
  }

}

function updateTotal() {
  const years = Object.keys(data.points).map(y => parseInt(y));
  const min = Math.min(...years);
  const max = Math.max(...years);
  const coverage = Math.floor(years.length * 100 / (max - min))
  document.querySelector("#total .value").innerHTML = `${years.length} (${coverage}%)`;
}

function updateStats() {
  updateHeader()
  updateRange()
  updateTable()
  updateTotal()
}

window.onload = updateStats