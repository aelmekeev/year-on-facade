# How to contribute

> **Note**
> Consider starting your own collection by forking this repository and creating a PR to add yours to [Other collections](https://github.com/aelmekeev/year-on-facade#other-collections) list as well!

It's a personal collection so contributions that are welcome:

* bug fixes to the code
* functionality improvements
* new locations

Contributions are welcome in form of pull request as well as [an issue](https://github.com/aelmekeev/year-on-facade/issues/new).

## Adding a new point

To contribute to this collection simply raise a pull request with a change in the correct file in `csv` folder.

> **Warning**
> Please review [rules for this collection](https://github.com/aelmekeev/year-on-facade#rules) first.

* If it's a new year in a city add `TODO` to the notes column (it will be removed once I visit it)
* If it's a replacement for existing year just add `_` after the year, e.g. `1925_`

> **Note**
> Please use web UI of Google Maps to keep coordinates precision consistent.

If you want to you can also run `make build` and `make validate` locally if you have `jq` installed, otherwise they will be executed as part of pull request pipelines.

Photos are managed locally by the maintainer of the collection with the help of `make photos`.

## Adding new city

> **Note**
> It's unlikely that I will visit the city outside of UK unless it's a capital of some other country. So probably you want to start your own collection by forking this repository and creating a PR to add yours to [Other collections](https://github.com/aelmekeev/year-on-facade#other-collections) list.

* add `./csv/<city name>.csv`
* add configuration for the city in `./utils/configs.json`

> **Note**
> Please use underscores instead of spaces in the city name, e.g. `New_York`.

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
