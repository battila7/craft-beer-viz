const { GOOGLE_MAPS_API_KEY } = process.env;

const { readFile, writeFile } = require('fs').promises;

const paths = require('./paths');

const googleMapsClient = require('@google/maps').createClient({
    key: GOOGLE_MAPS_API_KEY,
    Promise: Promise
});

(async function main() {
    const document = await readFile(paths.toJson).then(contents => JSON.parse(contents));

    const locations = uniqueLocations(document.breweries);

    const geocodedLocations = await geocodeLocations(locations);

    document.locations = geocodedLocations;

    embedLocationIntoBrewery(document);

    writeFile(paths.geocoder, JSON.stringify(document));
})();

function uniqueLocations(breweries) {
    const allLocations = breweries
        .map(({city, state}) => `${city}, ${state}`);

    return [...new Set(allLocations)];
}

async function geocodeLocations(locations) {
    const resultArray = [];
    let id = 0;

    for (const location of locations) {
        const response = await googleMapsClient.geocode({ address: location }).asPromise();

        const { lat, lng } = response.json.results.pop().geometry.location;

        const [city, state] = location.split(',');

        resultArray.push({
            id,
            lat,
            lng,
            city,
            state: state.trim()
        });

        ++id
    }

    return resultArray;
}

function embedLocationIntoBrewery({ breweries, locations }) {
    for (const brewery of breweries) {
        brewery.location = locations.find(loc => loc.state == brewery.state && loc.city == brewery.city);
    }
}
