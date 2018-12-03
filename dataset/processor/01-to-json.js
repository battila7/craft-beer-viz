const { writeFile } = require('fs').promises;

const csv = require('csvtojson');

const paths = require('./paths');

const BEERS_OUTPUT_PATH = paths.inOutputDirectory('01-to-json-beers.json');
const BREWERIES_OUTPUT_PATH = paths.inOutputDirectory('01-to-json-breweries.json');

[[paths.originalBeers, BEERS_OUTPUT_PATH], [paths.originalBreweries, BREWERIES_OUTPUT_PATH]]
    .forEach(([inputPath, outputPath]) => {
        csv()
            .fromFile(inputPath)
            .then(data => JSON.stringify(data))
            .then(contents => writeFile(outputPath, contents));
    });