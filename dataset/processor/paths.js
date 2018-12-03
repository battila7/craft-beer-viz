const path = require('path');

const outputDirectory = path.join(__dirname, '..', 'processed');
const originalDirectory = path.join(__dirname, '..', 'original');

const inOutputDirectory = (...fragments) => path.join(outputDirectory, ...fragments)
const inOriginalDirectory = (...fragments) => path.join(originalDirectory, ...fragments);

module.exports = {
    originalBeers: inOriginalDirectory('beers.csv'),
    originalBreweries: inOriginalDirectory('breweries.csv'),

    nationalities: inOriginalDirectory('nationality-map.json'),
    types: inOriginalDirectory('type-map.json'),

    toJson: inOutputDirectory('01-to-json.json'),
    geocoder: inOutputDirectory('02-geocoder.json'),
    beerIntoBrewery: inOutputDirectory('03-beer-into-brewery.json'),
    nationalityAndType: inOutputDirectory('04-nationality-and-type.json')
};
