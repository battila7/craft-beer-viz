self.onmessage = function onMessage(message) {
    main(message.data);
}

async function main() {
    const State = {
        data: {},
        centerlines: {}
    };

    sendStatusUpdate('Fetching dataset');

    await fetch('../data/dataset.json')
        .then(response => response.json())
        .then(dataset => State.data.dataset = dataset)

    sendStatusUpdate('Fetching state geometries');

    await fetch('../data/us-states.json')
        .then(response => response.json())
        .then(a => State.data.geometry = a)

    sendState();

    preloadBreweryLogos();

    async function preloadBreweryLogos() {
        State.data.breweryLogos = [];
        try {
            for (const state of Object.values(State.data.dataset.state.aggregate)) {
                const promises = state.breweries
                    .filter(brewery => brewery.hasLogo)
                    .map(brewery => {
                        return fetch(`../img/logo/${brewery.name}.jpg`)
                            .then(response => response.blob())
                            .then(blob => ({ blob, name: brewery.name }))
                            .catch(() => null)
                    });

                const results = await Promise.all(promises);

                sendLogos(results);
            }
        } catch (err) {
            console.log(err);
            console.log(err.stack)
        }
    }

    function sendState() {
        self.postMessage({ type: 'done', data: State });
    }

    function sendStatusUpdate(message) {
        self.postMessage({ type: 'statusUpdate', data: message });
    }

    function sendLogos(logos) {
        self.postMessage({ type: 'logos', data: logos.filter(logo => logo != null) });
    }
};
