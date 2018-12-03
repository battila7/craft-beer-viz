const { writeFile } = require('fs').promises;

const csv = require('csvtojson');

const paths = require('./paths');

const asJSONDocument = path => csv().fromFile(path)

Promise.all([paths.originalBeers, paths.originalBreweries].map(asJSONDocument))
    .then(([beers, breweries]) => ({ beers, breweries }))
    .then(document => JSON.stringify(document))
    .then(contents => writeFile(paths.toJson, contents));
