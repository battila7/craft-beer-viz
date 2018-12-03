const { readFile, writeFile } = require('fs').promises;

const paths = require('./paths');

(async function main() {
    const document = await readFile(paths.geocoder).then(contents => JSON.parse(contents));

    const transformed = embedBeersIntoBrewery(document);

    writeFile(paths.beerIntoBrewery, JSON.stringify(transformed));
})();

function embedBeersIntoBrewery({ beers, breweries }) {
    breweries.forEach(brewery => brewery.beers = []);

    for (const beer of beers) {
        const brewery = breweries.find(({ id }) => id == beer.brewery_id);

        brewery.beers.push(beer);
    }

    return breweries;
}
