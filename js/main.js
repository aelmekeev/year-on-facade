function parseCoordinatesString(coordinatesString) {
  return {
    lat: +coordinatesString.split(',')[0],
    lng: +coordinatesString.split(',')[1]
  }
}

function initMap() {
  var url = new URL(window.location.href);
  var year = url.searchParams.get("year");
  var points = year ? { [year]: data.points[year] } : data.points;

  var zoom = year ? 18 : data.config.zoom;
  var center = parseCoordinatesString(year ? points[year] : data.config.center);

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