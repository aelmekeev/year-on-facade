function parseCoordinatesString(coordinatesString) {
  return {
    lat: +coordinatesString.split(',')[0],
    lng: +coordinatesString.split(',')[1]
  }
}

function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: data.config.zoom,
    center: parseCoordinatesString(data.config.center),
    clickableIcons: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    },
    restriction: {
      latLngBounds: data.config.borders
    }
  });


  for (const year in data.points) {
    new google.maps.Marker({
      position: parseCoordinatesString(data.points[year]),
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