function parseCoordinatesString(coordinatesString) {
  return {
    lat: +coordinatesString.split(',')[0],
    lng: +coordinatesString.split(',')[1]
  }
}

function StatsControl(controlDiv) {
  controlDiv.classList.add("control");

  const controlUI = document.createElement("div");
  controlUI.classList.add("control-ui")
  controlUI.title = "Click to open the statistics";
  controlDiv.appendChild(controlUI);

  const controlText = document.createElement("div");
  controlText.classList.add("control-text");
  controlText.innerHTML = "Statistics";
  controlUI.appendChild(controlText);

  controlUI.addEventListener("click", () => {
    const currentUrl = window.location.href;
    window.location.href = currentUrl
      .replace("/map/", "/stats/")
      .replace(/&year=\d+/g, "")
      .replace(/\?year=\d+$/g, "")
      .replace(/\?year=\d+&/g, "?");
  });
}

function initMap() {
  const url = new URL(window.location.href);
  const year = url.searchParams.get("year");
  const points = data.points;

  const zoom = year ? 18 : data.config.zoom;
  const center = parseCoordinatesString(year ? points[year] : data.config.center);

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom,
    center,
    clickableIcons: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    },
    restriction: {
      latLngBounds: data.config.borders
    }
  });

  const statsControlDiv = document.createElement("div");
  StatsControl(statsControlDiv);
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(statsControlDiv);

  for (const year in points) {
    new google.maps.Marker({
      position: parseCoordinatesString(points[year]),
      map,
      title: year,
      label: {
        text: year,
        color: "white",
        fontSize: "9px"
      }
    });
  }
}