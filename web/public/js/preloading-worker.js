self.importScripts(
    'https://d3js.org/d3.v5.min.js',
    'simplify.js',
    'dijkstra.js',
    'centerline.js');

self.onmessage = function onMessage(message) {
    console.log(message.data);
    main(message.data);
}

async function main({ height, width, scale }) {
    const State = {
        data: {},
        centerlines: {}
    };

    await fetch('../data/dataset.json')
        .then(response => response.json())
        .then(dataset => State.data.dataset = dataset)

    await preloadBreweryLogos();

    await fetch('../data/us-states.json')
        .then(response => response.json())
        .then(a => State.data.geometry = a)
        .then(computeCenterlines)

    sendState();

    function computeCenterlines() {
        const projection =  d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale([scale]);

        State.data.geometry.features.forEach(feature => {
            return;

            if (['Puerto Rico', 'Hawaii', 'Maryland'].includes(feature.properties.name)) {
                return;
            }

            const abbreviation = State.data.dataset.inverseStateMap[feature.properties.name];
            const state = State.data.dataset.state.aggregate[abbreviation];

            if (!state) {
                return;
            }

            State.centerlines[feature.properties.name] = centerline.computeCenterline(feature, projection);
            console.log(feature.properties.name);
        });
    }

    async function preloadBreweryLogos() {
        State.data.breweryLogos = [];
        try {
        for (const state of Object.values(State.data.dataset.state.aggregate)) {
            for (const brewery of state.breweries) {
                if (!brewery.hasLogo) {
                    continue;
                }

                console.log(brewery.name);

                State.data.breweryLogos[brewery.name] = await fetch(`../img/logo/${brewery.name}.jpg`).then(response => response.blob());
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack)
    }
    }

    function sendState() {
        self.postMessage(State);
    }
};

