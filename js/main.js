function parseCoordinatesString(coordinatesString) {
  return {
    lat: +coordinatesString.split(',')[0],
    lng: +coordinatesString.split(',')[1]
  }
}

function initMap() {
  var url = new URL(window.location.href);
  var city = url.searchParams.get("city");
  const cityData = data[city] || data.London;

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: cityData.config.zoom,
    center: parseCoordinatesString(cityData.config.center),
    clickableIcons: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    },
    restriction: {
      latLngBounds: cityData.config.borders
    }
  });


  for (const year in cityData.points) {
    new google.maps.Marker({
      position: parseCoordinatesString(cityData.points[year]),
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