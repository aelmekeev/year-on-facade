function updateHeader() {
  var url = new URL(window.location.href);
  var city = url.searchParams.get("city") || "London";
  document.querySelector("h1").innerHTML = city;
}

function updateRange() {
  var years = Object.keys(data.points).map(y => parseInt(y));
  var min = Math.min(...years);
  var max = Math.max(...years);
  document.querySelector("#range .value").innerHTML = `${min} &mdash; ${max} (${max - min} years)`;
}

function redirectToExactPoint(year) {
  return function () {
    var currentUrl = window.location.href;
    window.location.href = currentUrl.replace("/stats", "") + (currentUrl.includes("?") ? "&" : "?") + "year=" + year;
  }
}

function updateTable() {
  var yearsInLine = 10

  var years = Object.keys(data.points).map(y => parseInt(y));
  var min = Math.floor(Math.min(...years) / yearsInLine) * yearsInLine;
  var max = Math.ceil(Math.max(...years) / yearsInLine) * yearsInLine;

  var parent = document.querySelector("#table");

  for (var r = min / yearsInLine; r < max / yearsInLine; r++) {
    var row = document.createElement('div');
    row.classList.add('row');
    for (var c = 0; c < yearsInLine; c++) {
      var year = document.createElement('div');
      year.classList.add('year');
      var currentYear = r * yearsInLine + c;
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
  var years = Object.keys(data.points).map(y => parseInt(y));
  var min = Math.min(...years);
  var max = Math.max(...years);
  var coverage = Math.floor(years.length * 100 / (max - min))
  document.querySelector("#total .value").innerHTML = `${years.length} (${coverage}%)`;
}

function updateStats() {
  updateHeader()
  updateRange()
  updateTable()
  updateTotal()
}

window.onload = updateStats