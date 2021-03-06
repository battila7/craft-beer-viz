const { readFile, writeFile } = require('fs').promises;

const paths = require('./paths');

(async function main() {
    const document = await readAsJSON(paths.nationalityAndType);
    const nationalityMap = await readAsJSON(paths.nationalities);
    const nationalities = Object.keys(nationalityMap);
    const typeMap = await readAsJSON(paths.types);
    const types = Object.keys(typeMap);
    const stateMap = await readAsJSON(paths.states);
    const nationalityNameMap = {
        "american": "American",
        "german": "German",
        "belgian": "Belgian",
        "dutch": "Dutch",
        "russian": "Russian",
        "english": "English",
        "scottish": "Scottish",
        "irish": "Irish",
        "french": "French",
        "misc": "Other",
        "czech": "Czech",
        "austrian": "Austrian"
    };

    const inverseStateMap = {};

    Object.keys(stateMap)
        .forEach(abbreviation => {
            inverseStateMap[stateMap[abbreviation]] = abbreviation;
        });

    const beers = document
        .map(brewery => {
            brewery.beers.forEach(beer => beer.state = brewery.state);
            brewery.hasLogo = paths.hasLogo(brewery.name);

            return brewery;
        })
        .map(brewery => brewery.beers)
        .reduce((acc, curr) => acc.concat(curr), []);

    beers.forEach(beer => beer.abv = Number.parseFloat(beer.abv));

    const allStates = document.map(brewery => brewery.state);

    const states = [...new Set(allStates)];

    const result = {
        beer: beers,
        type: calculateTypeAggregates(beers, types),
        nationality: calculateNationalityAggregates(beers, nationalities),
        state: calculateStateAggregates(beers, document, states, typeMap, nationalities, stateMap),
        style: calculateStyleAggregates(beers, typeMap),
        typeMap,
        nationalityMap,
        stateMap,
        inverseStateMap,
        nationalityNameMap
    };

    const nationalityCityPopularity = {};

    for (let nat of Object.keys(nationalityNameMap)) {
        let min = Number.MAX_SAFE_INTEGER;
        let max = Number.MIN_SAFE_INTEGER;

        for (let state of Object.values(result.state.aggregate)) {
            if (state.mostPopularNationality == nat) {
                console.log(nat);
                if (state.nationalityCount < min) {
                    min = state.nationalityCount;
                }

                if (state.nationalityCount > max) {
                    max = state.nationalityCount;
                }
            }
        }

        nationalityCityPopularity[nat] = { min, max };
    }

    result.nationalityCityPopularity = nationalityCityPopularity;

    console.log(result.nationalityCityPopularity);

    writeFile(paths.aggregate + '.asd.json', JSON.stringify(result));
})();

function readAsJSON(path) {
    return readFile(path).then(contents => JSON.parse(contents));
}

function calculateTypeAggregates(beers, types) {
    const beerCount = beers.length;

    const result = {
        values: types,
        aggregate: {}
    };

    types.forEach(type => {
        result.aggregate[type] = {
            count: 0,
            minAbv: 1,
            maxAbv: 0,
            avgAbv: 0,
            percentage: 0
        };
    });

    for (const beer of beers) {
        const aggregate = result.aggregate[beer.type];

        aggregate.count++;

        if (Number.isNaN(beer.abv)) {
            continue;
        }
        
        if (beer.abv < aggregate.minAbv) {
            aggregate.minAbv = beer.abv;
        }

        if (beer.abv > aggregate.maxAbv) {
            aggregate.maxAbv = beer.abv;
        }

        aggregate.avgAbv = aggregate.avgAbv + beer.abv;
    }

    for (const aggregate of Object.values(result.aggregate)) {
        aggregate.avgAbv /= aggregate.count;
        aggregate.percentage = aggregate.count / beerCount;
    }

    return result;
}

function calculateNationalityAggregates(beers, nationalities) {
    const beerCount = beers.length;
    const nonAmericanAndMiscCount = beers
        .filter(beer => beer.nationality != 'american')
        .filter(beer => beer.nationality != 'misc')
        .length;

    const result = {
        values: nationalities,
        aggregate: {}
    };

    nationalities.forEach(nationality => {
        result.aggregate[nationality] = {
            count: 0,
            percentage: 0,
            percentageWithoutAmericanAndMisc: 0
        };
    });

    for (const beer of beers) {
        const aggregate = result.aggregate[beer.nationality];

        aggregate.count++;
    }

    for (const key of Object.keys(result.aggregate)) {
        result.aggregate[key].percentage = result.aggregate[key].count / beerCount;

        if ((key != 'american') && (key != 'misc')) {
            result.aggregate[key].percentageWithoutAmericanAndMisc = result.aggregate[key].count / nonAmericanAndMiscCount;
        }
    }

    return result;
}

function calculateStateAggregates(beers, breweries, states, typeMap, nationalities, stateMap) {
    const beerCount = beers.length;
    const types = Object.keys(typeMap);

    const result = {
        values: states,
        aggregate: {}
    };

    states.forEach(state => {
        const stateBeers = beers.filter(beer => beer.state == state);
        const stateBreweries = breweries.filter(brewery => brewery.state == state);
        let stateCities = 
            stateBreweries
                .map(brewery => Object.assign({}, brewery.location, { breweries: [] }))
                .filter((value, index, self) => {
                    return self.findIndex(other => other.lat == value.lat && other.lng == value.lng) == index;
                })
                .sort((a, b) => a.city.localeCompare(b.city));

        stateBreweries.forEach(brewery => {
            const city = stateCities.find(c => c.city == brewery.location.city)

            if (city) {
                city.breweries.push(brewery);
            }
        })

        stateCities.forEach(city => {
            city.breweries.sort((a, b) => a.name.localeCompare(b.name));
        });

        result.aggregate[state] = {
            name: stateMap[state],
            abbreviation: state,

            type: calculateTypeAggregates(stateBeers, types),
            nationality: calculateNationalityAggregates(stateBeers, nationalities),
            style: calculateStyleAggregates(stateBeers, typeMap),
            percentage: stateBeers.length / beerCount,
            numberOfBeers: stateBeers.length,
            numberOfBreweries: stateBreweries.length,

            beers: stateBeers,
            breweries: stateBreweries,
            cities: stateCities,

            mostPopularType: null,
            mostPopularNationality: null,
            mostPopularStyle: null,
            typePopularities: null,
            nationalityPopularities: null,
            stylePopularities: null
        };
    });

    for (const aggregate of Object.values(result.aggregate)) {
        let typeCopy = [];
        for (const key of Object.keys(aggregate.type.aggregate)) {
            typeCopy.push({
                key,
                percentage: aggregate.type.aggregate[key].percentage
            });
        }
        typeCopy.sort((a, b) => a.percentage - b.percentage);
        aggregate.typePopularities = typeCopy;
        aggregate.mostPopularType = typeCopy[typeCopy.length - 1].key;

        let natCopy = [];
        for (const key of Object.keys(aggregate.nationality.aggregate)) {
            natCopy.push({
                key,
                percentage: aggregate.nationality.aggregate[key].percentage
            });
        }
        natCopy.sort((a, b) => a.percentage - b.percentage);
        aggregate.nationalityPopularities = natCopy;

        for (let i = natCopy.length - 1; i >= 0; --i) {
            if ((natCopy[i].key != 'american') && (natCopy[i].key != 'misc') && (natCopy[i].percentage > 0)) {
                aggregate.mostPopularNationality = natCopy[i].key;
                break;
            }
        }

        if (!aggregate.mostPopularNationality) {
            aggregate.mostPopularNationality = 'unknown';
        }

        let natNoAmMiscCopy = [];
        for (const key of Object.keys(aggregate.nationality.aggregate)) {
            natNoAmMiscCopy.push({
                key,
                percentage: aggregate.nationality.aggregate[key].percentageWithoutAmericanAndMisc
            });
        }
        natNoAmMiscCopy.sort((a, b) => a.percentage - b.percentage);
        aggregate.nationalityWithoutAmericanAndMiscPopularities = natNoAmMiscCopy;

        let styleCopy = [];
        for (const key of Object.keys(aggregate.style.aggregate)) {
            styleCopy.push({
                key,
                percentage: aggregate.style.aggregate[key].percentage
            });
        }
        styleCopy.sort((a, b) => a.percentage - b.percentage);
        aggregate.stylePopularities = styleCopy;
        aggregate.mostPopularStyle = styleCopy[styleCopy.length - 1].key;
    }

    for (let state of Object.values(result.aggregate)) {
        const nat = state.mostPopularNationality;

        const cities = state.cities.map(city => {
            const cityCopy = Object.assign({}, city);

            cityCopy.breweries = city.breweries.map(brewery => {
                const breweryCopy = Object.assign({}, brewery);

                breweryCopy.beers = brewery.beers.filter(beer => beer.nationality == nat);

                return breweryCopy;
            }).filter(brewery => brewery.beers.length > 0);

            return cityCopy;
        }).filter(city => city.breweries.length > 0);

        state.nationalityCities = cities;

        state.nationalityCount = cities
            .map(city => city.breweries)
            .reduce((acc, curr) => acc.concat(curr), [])
            .map(brewery => brewery.beers)
            .reduce((acc, curr) => acc.concat(curr), [])
            .length;
        
        console.log(state.nationalityCount);
    }

    return result;
}

// For each style, calculate its percentage in its type
function calculateStyleAggregates(beers, typeMap) {
    const beerCount = beers.length;

    const unique = [...new Set(beers.map(beer => beer.style))];

    const result = {
        values: unique,
        aggregate: {}
    };

    const styles = {};

    const typeCounts = {};
    Object.keys(typeMap).forEach(type => typeCounts[type] = 0);

    for (const beer of beers) {
        if (styles[beer.style]) {
            styles[beer.style]++
        } else {
            styles[beer.style] = 1;
        }
        typeCounts[beer.type]++;
    }

    unique.forEach(style => {
        result.aggregate[style] = {
            percentage: styles[style] / beerCount,
            percentageType: styles[style] / typeCounts[styleToType(style)]
        }
    });

    return result;

    function styleToType(style) {
        for (const key of Object.keys(typeMap)) {
            if (typeMap[key].includes(style)) {
                return key;
            }
        }
    }
}
