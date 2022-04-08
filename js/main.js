function parseCoordinatesString(coordinatesString) {
  return {
    lat: +coordinatesString.split(',')[0],
    lng: +coordinatesString.split(',')[1]
  }
}

function initMap() {
  const cityData = data.London;

  console.log(cityData.config.zoom)
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: cityData.config.zoom,
    center: parseCoordinatesString(cityData.config.center),
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