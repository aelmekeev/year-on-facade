# Year on Facade

This is a collection of years on facades.

https://aelmekeev.github.io/year-on-facade/

## Rules

In order to be added to collection the location needs to meet the following requirements:

1. The year must be part of the building and should be associated with it ([examples](https://www.instagram.com/year_on_facade/)):
    * Year of the construction / reconstruction :white_check_mark:
    * Name of the organization located in the building :x:
2. The building must be located in administrative boundaries of particular city.
3. Be verifiable via Google Street View.

## Contribution

Simply raise a pull request with a change in the correct file in `csv` folder.

**Note:** it's better to use web UI of Google Maps to keep coordinates precision consistent.

If you want to you can also run `make build` and `make validate` locally if you have `jq` installed, otherwise they will be executed as part of pull request pipelines.

### Adding new city

* add `./csv/<city name>.csv`
* add configuration for the city in `./utils/configs.json`

**Note:** please use underscores instead of spaces in the city name, e.g. `New_York`.