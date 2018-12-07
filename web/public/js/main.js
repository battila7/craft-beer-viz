/*
 * Original map drawing and us-states.json by Michelle Chandra:
 *   http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
 */

(async function mainIIFE() {
    const State = {
        data: {},
        elements: {}
    };

    document.addEventListener('DOMContentLoaded', function() {
        initializeMaterializeElements();

        initializeMainMapVizModeTriggers();

        if (askForCookiePermission()) {
            openCookieModal();
        } else {
            openPreloadingModal();
        }
    });

    function askForCookiePermission() {
        return document.cookie.length == 0;
    }

    function openCookieModal() {
        const cookieModal = document.querySelector('.cookie-modal');
        const instance = M.Modal.getInstance(cookieModal);
        instance.options.dismissible = false;
        instance.open();
    }

    function openPreloadingModal() {
        const preloadingModal = document.querySelector('.preloading-modal');
        const instance = M.Modal.getInstance(preloadingModal);
        instance.options.dismissible = false;
        instance.open();

        (function preloadingAnimation() {
            const getText = function getText() {
                let counter = 0;

                return function() {
                    counter = (counter + 1) % 4;

                    return `Preloading${'.'.repeat(counter)}`;
                }
            }();

            const adjustTitle = function adjustTitle() {
                document.querySelector('.preloading-header > .title').textContent = getText();
            };

            State.preloadingAnimation =  setInterval(adjustTitle, 500);
        })();

        setTimeout(preload, 1);
    }

    function closePreloadingModal() {
        clearInterval(State.preloadingAnimation);

        const preloadingModal = document.querySelector('.preloading-modal');
        M.Modal.getInstance(preloadingModal).close();

        if (shouldOpenTapTip()) {
            openTapTip();
        }
    }

    function openTapTip() {
        const firstUseTapTarget = document.querySelector('.tap-target');
        const instance = M.TapTarget.getInstance(firstUseTapTarget);

        instance.options.onClose = function onTapTipClose() {
            saveTapTipOpened();
        }

        instance.open();
    }

    function shouldOpenTapTip() {
        return document.cookie.replace(/(?:(?:^|.*;\s*)tapTipOpened\s*\=\s*([^;]*).*$)|^.*$/, '$1') !== 'true'
    }

    function saveTapTipOpened() {
        document.cookie = 'tapTipOpened=true; expires=Fri, 31 Dec 9999 23:59:59 GMT';
    }

    async function preload() {
        setupMainMap();

        State.preloadingWorker = new Worker('js/preloading-worker.js');

        State.preloadingWorker.postMessage({
            height: State.mainMap.height,
            width: State.mainMap.width,
            scale: State.mainMap.scale
        });

        State.preloadingWorker.onmessage = function onMessage(message) {
            State.data = message.data.data;
            State.centerlines = message.data.centerlines;

            endPreload();
        }
    }

    async function endPreload() {
        closePreloadingModal();

        resetMainMap();
    }

    async function setupMainMap() {
        State.elements.mainMap = d3.select('.us-map')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

        const { height, width } = document.querySelector('.us-map > svg').getClientRects()[0];

        const projection =  d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale([width]);

        const path = d3.geoPath().projection(projection);

        State.mainMap = {
            height, 
            width,
            scale: width,
            projection,
            path
        };
    }

    function initializeMaterializeElements() {
        const firstUseTapTarget = document.querySelector('.tap-target');
        M.TapTarget.init(firstUseTapTarget, {});
    
        const sidenav = document.querySelector('.sidenav');
        M.Sidenav.init(sidenav, {
            edge: 'right'
        });
    
        const modals = document.querySelectorAll('.modal');
        M.Modal.init(modals, {});
    
        document.querySelector('.viz-mode-modal-trigger').addEventListener('click', function vizModeModalTriggerClick() {
            const sidenav = document.querySelector('.sidenav');
            M.Sidenav.getInstance(sidenav).close();
    
            const modal = document.getElementById('viz-mode-modal');
            M.Modal.getInstance(modal).open();
        });

        document.querySelector('.cookie-fail').addEventListener('click', function cookieOffClick() {
            window.location = 'http://www.nocookie.com/';
        });

        document.querySelector('.cookie-okay').addEventListener('click', function cookieOnClick() {
            const cookieModal = document.querySelector('.cookie-modal');
            M.Modal.getInstance(cookieModal).close();
            openPreloadingModal();
        });
    }

    function initializeMainMapVizModeTriggers() {
        setupMainMapColorViz({
            triggerSelector: '.number-of-beers-action',
            legendEntries: [
                { value: 0.0, text: 'No beers at all.' },
                { value: 0.5, text: 'Moderate number of beers.' },
                { value: 1.0, text: 'Tons of beers.' }
            ],
            legendDescription: 'The color indicates the number of beers.',
            propertyName: 'numberOfBeers',
            selectionValue: (value) => `Number of beers: ${value}`
        });

        setupMainMapColorViz({
            triggerSelector: '.number-of-breweries-action',
            legendEntries: [
                { value: 0.0, text: 'No breweries at all.' },
                { value: 0.5, text: 'Moderate number of breweries.' },
                { value: 1.0, text: 'Tons of breweries.' }
            ],
            legendDescription: 'The color indicates the number of breweries.',
            propertyName: 'numberOfBreweries',
            selectionValue: (value) => `Number of breweries: ${value}`
        });

        setupMainMapLabelViz({
            triggerSelector: '.most-popular-nationality-action',
            propertyName: 'mostPopularNationality'
        });

        setupMainMapLabelViz({
            triggerSelector: '.most-popular-type-action',
            propertyName: 'mostPopularType'
        });
    }

    function resetMainMap() {
        const mp = document.querySelector('.us-map > svg');

        while (mp.firstChild) {
            mp.removeChild(mp.firstChild);
        }

        State.elements.mainMap.selectAll('path')
            .data(State.data.geometry.features)
            .enter()
            .append('path')
            .attr('d', State.mainMap.path)
            .style('stroke', '#fff')
            .style('stroke-width', '1')
            .style('fill', 'rgb(213,222,217)');
    }

    function setupMainMapColorViz(options) {
        document.querySelector(options.triggerSelector).addEventListener('click', function() {
            const vizModeModal = document.getElementById('viz-mode-modal');
            M.Modal.getInstance(vizModeModal).close();
    
            const legendCardContainer = document.querySelector('.legend-card-container');
    
            legendCardContainer.classList.add('fade');

            const legendEntries = options.legendEntries.map(({ value, text }) => ({ color: interpolateColor(value), text }));
    
            initializeLegendPanel(options.legendDescription, legendEntries);

            unsetLegendSelection();

            resetMainMap();
    
            let max = 0;
            for (const state of Object.values(State.data.dataset.state.aggregate)) {
                if (state[options.propertyName] > max) {
                    max = state[options.propertyName]
                }
            }
    
            State.elements.mainMap.selectAll('path')
                .style('fill', function (d) {
                    const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                    const state = State.data.dataset.state.aggregate[abbreviation];
    
                    if (!state) {
                        return interpolateColor(0);
                    }
    
                    return interpolateColor(state[options.propertyName] / max);
                })
                .on('mouseover', function(d) {
                    const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                    const state = State.data.dataset.state.aggregate[abbreviation];
    
                    setLegendSelection(`State: ${state.name}`, options.selectionValue(state[options.propertyName]));
                })
                .on('mouseleave', function() {
                    unsetLegendSelection();
                })
        });
    }

    function setupMainMapLabelViz(options) {
        document.querySelector(options.triggerSelector).addEventListener('click', function() {
            const vizModeModal = document.getElementById('viz-mode-modal');
            M.Modal.getInstance(vizModeModal).close();
    
            const legendCardContainer = document.querySelector('.legend-card-container');
    
            legendCardContainer.classList.remove('fade');
            unsetLegendSelection();
    
            resetMainMap();

            const mainMapSvg = document.querySelector('.us-map > svg');
    
            State.data.geometry.features.forEach((feature, index) => {
                if (['Puerto Rico', 'Hawaii', 'Maryland'].includes(feature.properties.name)) {
                    return;
                }

                const abbreviation = State.data.dataset.inverseStateMap[feature.properties.name];
                const state = State.data.dataset.state.aggregate[abbreviation];

                if (!state) {
                    return;
                }

                let text;
                if (options.propertyName == 'mostPopularNationality') {
                    text = State.data.dataset.nationalityNameMap[state[options.propertyName]];
                } else {
                    text = state[options.propertyName];
                }                

                const label = centerline.placeTextAlongCenterline(State.centerlines[feature.properties.name], 
                        feature, 
                        State.mainMap.projection, 
                        State.mainMap.width,
                        State.mainMap.height,
                        `pa${index}`,
                        text);
    
                mainMapSvg.innerHTML += label;
            });
        });
    }

    function setLegendSelection(name, value) {
        const nameElement = document.querySelector('.selection-name');
        const valueElement = document.querySelector('.selection-value');

        if (!nameElement) {
            return;
        }

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

