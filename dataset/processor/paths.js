const path = require('path');

const outputDirectory = path.join(__dirname, '..', 'processed');

module.exports = {
    originalBeers: path.join(__dirname, '..', 'original', 'beers.csv'),
    originalBreweries: path.join(__dirname, '..', 'original', 'beers.csv'),

    inOutputDirectory: (...fragments) => path.join(outputDirectory, ...fragments)
};
