const { readFile, writeFile } = require('fs').promises;

const paths = require('./paths');

(async function main() {
    const document = await readAsJSON(paths.beerIntoBrewery);
    const nationalityMap = await readAsJSON(paths.nationalities);
    const typeMap = await readAsJSON(paths.types);

    const beers = document
        .map(brewery => brewery.beers)
        .reduce((acc, curr) => acc.concat(curr), [])
        .forEach(beer => {
            augment(beer, nationalityMap, 'nationality');
            augment(beer, typeMap, 'type');
        });

    writeFile(paths.nationalityAndType, JSON.stringify(document));
})();

function readAsJSON(path) {
    return readFile(path).then(contents => JSON.parse(contents));
}

function augment(beer, map, propertyName) {
    for (const key of Object.keys(map)) {
        if (map[key].includes(beer.style)) {
            beer[propertyName] = key;
            return;
        }
    }
}
