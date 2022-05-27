# How to contribute

To contribute to this collection simply raise a pull request with a change in the correct file in `csv` folder.

**Note:** please use web UI of Google Maps to keep coordinates precision consistent.

If you want to you can also run `make build` and `make validate` locally if you have `jq` installed, otherwise they will be executed as part of pull request pipelines.

Photos are managed locally by the maintainer of the collection with the help of `make photos`.

## Adding new city

* add `./csv/<city name>.csv`
* add configuration for the city in `./utils/configs.json`

**Note:** please use underscores instead of spaces in the city name, e.g. `New_York`.

## Configuration

`config.json` contains the following:

* `useInternalMap` controls wether links on the Stats page will lead to a "builtin" map with all the markers, or to google maps website / application
* `apiKey` is the Google Maps API key restricted to `Maps JavaScript API`
* `photosBaseUrl` contains base URL for the photos shown on the item page, the url would look like `${photosBaseUrl}/${city}/${year}_close.jpg` and  `${photosBaseUrl}/${city}/${year}.jpg`. If not specified, photo won't be shown.

Don't forget to update these values if you decided to fork this repository.

## Local testing

Local testing is required only when you are contributing to the collection tooling. For this you would need:

* installed [jq](https://stedolan.github.io/jq/)
* [Google Maps API key](https://developers.google.com/maps/documentation/javascript/get-api-key#creating-api-keys)
  * you can modify the key in the `map/index.html`

Don't forget to run `make build` if you modify any of the following:
* `csv/*.csv`
* `utils/configs.json`
* `config.json`
