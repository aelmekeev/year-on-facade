# Historic England utils

This is a collection of utils that can help to work with the data from [Historic England](https://historicengland.org.uk/listing/the-list/data-downloads/).

## Prerequisites

1. `brew install gdal` to install [GDAL](https://gdal.org/index.html)

## Instructions

### Preparation

1. Download `Listed Buildings (points)` from https://historicengland.org.uk/listing/the-list/data-downloads/
2. Unpack and open `ListedBuildings_<date>.dbf` file with e.g. LibreOffice
3. Remove all the columns other than below
    * ListEntry
    * Name
    * Location
    * Grade
    * Easting
    * Northing
4. Save the file as `input.csv` in `prepare` folder.
5. Run `ogr2ogr -lco GEOMETRY=AS_YX -s_srs epsg:27700 -t_srs epsg:4326 -f CSV out.csv config.vrt`
6. Change headers in `out.csv` to `lat,lng,id,name,location,grade,ngr,east,north`

### Database

To put above data into a postgres database you should:

```shell
cd db
docker build -t year-on-facade .
docker run --rm --name year-on-facade -v $HOME/git/year-on-facade/utils/historic-england/db/pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=db -p 6666:5432 year-on-facade
```

After this in a new terminal:

```shell
cp ../prepare/out.csv ./pgdata
docker exec -it year-on-facade psql -U postgres -d db
```

Now you can copy the data from csv:

```sql
\copy listings FROM '/var/lib/postgresql/data/out.csv' DELIMITER ',' CSV HEADER;
```

### Crawl

Unfortunately, there is no listings entry details in the downloads so we will have to scrape the data.

This can be achieved by:

```shell
_crawl.sh <start id> <end id>
```

Note: Minimum and maximum ids can be found with:
```sql
SELECT MIN(id), MAX(id) FROM listings;
   min   |   max   
---------+---------
 1021466 | 1482860
 ```

To put the years data into the database you can:

```
docker run --rm --name year-on-facade -v $HOME/git/year-on-facade/utils/historic-england/db/pgdata:/var/lib/postgresql/data -v $HOME/git/year-on-facade/utils/historic-england/crawl:/var/lib/postgresql/crawl -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=db -p 6666:5432 year-on-facade
```

```bash
cat **/*-list > all-list.csv && sed -i '' '/years/d' all-list.csv && sort -u -o all-list.csv all-list.csv
# you may have to update the path and run this multiple times you've being running `_crawl.sh` in batches
rm _crawl.sh && for eachfile in $(ls | grep -Ev "(list|descriptions)"); do echo "INSERT INTO descriptions values ($eachfile, pg_read_file('/var/lib/postgresql/crawl/$eachfile'));"; done > descriptions.sql
```

```sql
CREATE TABLE years (
  id INT PRIMARY KEY,
  years VARCHAR(1024)
);
\copy years FROM '/var/lib/postgresql/crawl/all-list.csv' DELIMITER ',' CSV;

CREATE TABLE descriptions (
  id INT PRIMARY KEY,
  descriptions text 
);
\i '/var/lib/postgresql/crawl/descriptions.sql';
```

### Analysis

After above steps you should have the database that can be queried relatively easily.

```bash
docker run --rm --name year-on-facade -v $HOME/git/year-on-facade/utils/historic-england/db/pgdata:/var/lib/postgresql/data -v $HOME/git/year-on-facade/utils/historic-england/analysis:/var/lib/postgresql/analysis -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=db -p 6666:5432 year-on-facade
```

Here is an example of the query:

```sql
COPY (SELECT d.id, years, 'https://www.google.com/maps?q=' || lat || ',' || lng as link, substring(descriptions from '.{0,40}1869.{0,20}'), descriptions FROM descriptions d JOIN years y ON d.id = y.id
JOIN listings l ON l.id = d.id WHERE years LIKE '1869%' AND lat > 51.279860 AND lat < 51.692042 AND lng > -0.524924 AND lng < 0.323770) To '/var/lib/postgresql/analysis/1869.csv' With CSV DELIMITER ',' HEADER;
```

If you want to generate data for a bunch of years at the same time you can run something like this:


```bash
rm queries.sql && for i in $(seq -f "%.0f" 1856 1856); do echo "COPY (SELECT d.id, 'https://www.google.com/maps?q=' || lat || ',' || lng as link, lat, lng, descriptions FROM descriptions d JOIN years y ON d.id = y.id JOIN listings l ON l.id = d.id WHERE years LIKE '$i%') To '/var/lib/postgresql/analysis/$i.csv' With CSV DELIMITER ',' HEADER;" >> queries.sql; done
```

and then

```sql
\i '/var/lib/postgresql/analysis/queries.sql';
```

## Other

Things that can be excluded from the list:
* Monument
* Memorial
* Milestone
* Telephone Kiosk
* Headstone
* Chest tomb
* Bridge over
* Lamp post
* Letter box
* Mile post
* Milepost
* Pump at
* fountain
* statue
