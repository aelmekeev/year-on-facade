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
      .replace(/&year=\d+/g, "");
  });
}

function initMap() {
  const url = new URL(window.location.href);
  const year = url.searchParams.get("year");
  const points = data.points;

  const zoom = year ? 18 : data.config.zoom;
  const center = year ? points[year].latlng : data.config.center;

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
    const marker = new google.maps.Marker({
      position: points[year].latlng,
      map,
      title: year,
      label: {
        text: year,
        color: "white",
        fontSize: "9px"
      }
    });
    marker.addListener("click", () => {
      map.setZoom(15);
      map.setCenter(marker.getPosition());
    });
  }
}