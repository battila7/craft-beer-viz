/*
 * Original map drawing and us-states.json by Michelle Chandra:
 *   http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
 */

document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.tap-target');
    var instances = M.TapTarget.init(elems, { isOpen: true });
    instances[0].open();

    var elems = document.querySelectorAll('.sidenav');
    var instances = M.Sidenav.init(elems, {
        edge: 'right'
    });

    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {});

    var elem = document.querySelector('.viz-mode-modal-trigger');
    elem.addEventListener('click', function () {
        var elems = document.querySelectorAll('.sidenav');
        var instance = M.Sidenav.getInstance(elems[0]);
        instance.close();

        var elem = document.getElementById('viz-mode-modal');
        var instance = M.Modal.getInstance(elem);
        instance.open();
    });
});
(async function mainIIFE() {
    const State = {
        data: {},
        elements: {}
    };

    createMainMap();

    const { height, width } = document.querySelector('.us-map > svg').getClientRects()[0];

    // Translate to center of screen and scale down to see the entire US.
    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale([width]);
            
    const path = d3.geoPath().projection(projection);

    await loadMapGeometry();
    await loadDataset();

    State.elements.mainMap.selectAll('path')
        .data(State.data.geometry.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('stroke', '#fff')
        .style('stroke-width', '1')
        .style('fill', 'rgb(213,222,217)');

    document.querySelector('.number-of-breweries-action').addEventListener('click', function() {
        var elem = document.getElementById('viz-mode-modal');
        var instance = M.Modal.getInstance(elem);
        instance.close();

        var elem = document.querySelector('.legend-card-container');

        elem.classList.add('fade');
        const legs = [
            { color: interpolateColor(0), text: 'No breweries at all.' },
            { color: interpolateColor(0.5), text: 'Moderate number of breweries.' },
            { color: interpolateColor(1), text: 'Tons of breweries.' }
        ];

        initializeLegendPanel("The color indicates the number of breweries.", legs);

        let max = 0;
        for (const state of Object.values(State.data.dataset.state.aggregate)) {
            if (state.numberOfBreweries > max) {
                max = state.numberOfBreweries;
            }
        }

        State.elements.mainMap.selectAll('path')
            .style('fill', function (d) {
                const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                const state = State.data.dataset.state.aggregate[abbreviation];

                if (!state) {
                    return interpolateColor(0);
                }

                return interpolateColor(state.numberOfBreweries / max);
            })
            .on('mouseover', function(d) {
                const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                const state = State.data.dataset.state.aggregate[abbreviation];

                setLegendSelection(`State: ${state.name}`, `Number of Breweries: ${state.numberOfBreweries}`);
            })
            .on('mouseleave', function() {
                unsetLegendSelection();
            })
    });

    function setLegendSelection(name, value) {
        const nameElement = document.querySelector('.selection-name');
        const valueElement = document.querySelector('.selection-value');

        nameElement.innerHTML = name;
        valueElement.innerHTML = value;
    }

    function unsetLegendSelection() {
        setLegendSelection('', '');
    }

    function initializeLegendPanel(description, legends) {
        const container = document.querySelector('.legend-container');
        container.innerHTML = '';

        const contents = `
            <p>
                ${description}
            </p>
            ${createLegend(legends)}
            <div class="selection-container">
                <div class="selection-title">Selection</div>
                <div class="selection-name"></div>
                <div class="selection-value"></div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = contents;

        container.appendChild(wrapper);
    }

    function createLegend(descs) {
        const contents = descs.map(({ text, color }) => {
            return `
                <div>
                    <svg height="15" width="15" class="plot-legend-color-circle">
                        <circle cx="7.5" cy="7.5" r="7" stroke="black" stroke-width="0" fill="${color}" />
                    </svg>
                    <span>
                        ${text}
                    </span>
                </div>
            `
        }).join('');

        return `
            <div class="legend-list">
                ${contents}
            </div>
        `;
    }

    function createMainMap() {
        State.elements.mainMap = d3.select('.us-map')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');
    }

    function loadDataset() {
        return fetch('data/dataset.json')
            .then(response => response.json())
            .then(dataset => State.data.dataset = dataset);
    };

    function loadMapGeometry() {
        return fetch('data/us-states.json')
            .then(response => response.json())
            .then(a => State.data.geometry = a);
    };

    function interpolateColor(t) {
        const r1 = 213, g1 = 222, b1 = 217;
        const r2 = 255, g2 = 68, b2 = 51;

        const r = (r2 - r1) * t + r1;
        const g = (g2 - g1) * t + g1;
        const b = (b2 - b1) * t + b1;

        return `rgb(${r} ${g} ${b})`;
    }
})();
