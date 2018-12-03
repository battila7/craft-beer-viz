const path = require('path');

const outputDirectory = path.join(__dirname, '..', 'processed');

const inOutputDirectory = (...fragments) => path.join(outputDirectory, ...fragments)

module.exports = {
    originalBeers: path.join(__dirname, '..', 'original', 'beers.csv'),
    originalBreweries: path.join(__dirname, '..', 'original', 'breweries.csv'),

    toJson: inOutputDirectory('01-to-json.json'),
    geocoder: inOutputDirectory('02-geocoder.json')
};
