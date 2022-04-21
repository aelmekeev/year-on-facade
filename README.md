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

It is OK to replace existing points in case the replacement:

1. either represent some landmark / building with interesting history
2. or makes distribution of the points on the map nicer (i.e. less crowdy)

## Contribution

Simply raise a pull request with a change in the correct file in `csv` folder.

**Note:** it's better to use web UI of Google Maps to keep coordinates precision consistent.

If you want to you can also run `make build` and `make validate` locally if you have `jq` installed, otherwise they will be executed as part of pull request pipelines.

### Adding new city

* add `./csv/<city name>.csv`
* add configuration for the city in `./utils/configs.json`

**Note:** please use underscores instead of spaces in the city name, e.g. `New_York`.

## Similar projects

* [Waymarking.com](waymarking.com) provides the tools to share and discover unique and interesting locations on the planet. Stone Corners group maintains a collection of Dated Buildings and Cornerstones - Buildings on which the date of construction was incorporated in the fabric of the building by the builders and is clearly visible. Here is an [example for London](https://www.waymarking.com/cat/details.aspx?f=1&guid=f95ee474-324f-408c-83d4-85151f84829b&wo=True&s=220&ct=11&st=2).
* [Colouring London](https://colouring.london/) is a free knowledge exchange platform designed to provide over fifty types of open data ([including age](https://www.pages.colouring.london/age)) on London buildings, to help make the city more sustainable.
* [CDRC Dwelling Age maps](https://mapmaker.cdrc.ac.uk/#/dwelling-age) allows to see residential building age for many towns and cities in England and Wales.