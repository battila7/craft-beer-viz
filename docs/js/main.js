/*
 * Original map drawing and us-states.json by Michelle Chandra:
 *   http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
 */

(async function mainIIFE() {
    const State = {
        data: {},
        elements: {},
        audio: {
            pour: new Audio('/audio/pour.mp3')
        },
        handle: {
            stateFadeAnimationFrame: null,
            pourAnimationFrame: null
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        initializeMaterializeElements();

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
            const payload = message.data;

            if (payload.type == 'statusUpdate') {
                document.querySelector('.preloading-description').textContent = payload.data;
            }

            if (payload.type == 'logos') {
                payload.data.forEach(({ name, blob }) => State.data.breweryLogos[name] = blob);
            }
            
            if (payload.type == 'done') {
                State.data = payload.data.data;
                State.data.breweryLogos = Object.create(null);
                State.centerlines = payload.data.centerlines;

                endPreload();
            }
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
        const modals = document.querySelectorAll('.modal');
        M.Modal.init(modals, {});

        const tabs = document.querySelectorAll('.tabs');
        M.Tabs.init(tabs, {});

        document.querySelector('.cookie-fail').addEventListener('click', function cookieOffClick() {
            window.location = 'http://www.nocookie.com/';
        });

        document.querySelector('.cookie-okay').addEventListener('click', function cookieOnClick() {
            const cookieModal = document.querySelector('.cookie-modal');
            M.Modal.getInstance(cookieModal).close();
            openPreloadingModal();
        });

        document.querySelector('.details-close').addEventListener('click', function detailsCloseClick() {
            const detailsOverlay = document.querySelector('.details-overlay');
            detailsOverlay.classList.remove('fade');

            const detailsSidebar = document.querySelector('.details-sidebar');
            detailsSidebar.classList.remove('slide');

            const detailsFigure = document.querySelector('.details-figure');
            detailsFigure.classList.remove('fade');

            document.querySelector('.map-container > svg').remove();

            State.audio.pour.pause();
        });
    }

    function showDetailsView(d, state) {
        document.querySelector('.state-details').scrollTop = 0;

        const detailsOverlay = document.querySelector('.details-overlay');
        detailsOverlay.classList.add('fade');

        const detailsSidebar = document.querySelector('.details-sidebar');
        detailsSidebar.classList.add('slide');

        const detailsFigure = document.querySelector('.details-figure');
        detailsFigure.classList.add('fade');

        const mp = d3.select('.details-figure > .map-container')
            .append('svg')
            .attr('width', '75%')
            .attr('height', '100%');

        const { height, width } = document.querySelector('.map-container > svg').getClientRects()[0];

        const projection = d3
            .geoAlbersUsa()
            .fitExtent([[5, 5], [width - 5, height - 5]], d);

        const path = d3.geoPath().projection(projection);

        const div = d3.select('.details-tooltip');

        document.querySelector('.state-name').textContent = state.name;

        const breweriesCollection = document.querySelector('.state-breweries-collection');
    
        while (breweriesCollection.firstChild) {
            breweriesCollection.removeChild(breweriesCollection.firstChild);
        }

        state.cities
            .forEach(city => {
                const listElement = document.createElement('li');
                listElement.classList.add('city-name-element');
                listElement.innerHTML = `<div>${city.city}</div>`
                breweriesCollection.appendChild(listElement);

                const beers = city.breweries.map(brewery => {
                    const breweryCopy = Object.assign({}, brewery);
                    delete breweryCopy.beers;

                    return brewery.beers.map(beer => Object.assign({ brewery: breweryCopy }, beer));
                }).reduce((acc, curr) => acc.concat(curr), []);

                beers.sort((a, b) => {
                     const breweryCompare = a.brewery.name.localeCompare(b.brewery.name);

                     if (breweryCompare != 0) {
                         return breweryCompare;
                     } else {
                         return a.name.localeCompare(b.name);
                     }
                });

                beers.forEach((beer, index) => {
                    const listElement = document.createElement('li');
                    listElement.classList.add('collection-item', 'avatar');

                    if (beer.brewery.hasLogo && State.data.breweryLogos[beer.brewery.name]) {
                        const img = document.createElement('img');
                        img.src = window.URL.createObjectURL(State.data.breweryLogos[beer.brewery.name]);
                        img.classList.add('circle');
                        img.onload = function() {
                            URL.revokeObjectURL(this.src);
                        }
                        listElement.appendChild(img);
                    }

                    if (beer.nationality && beer.nationality != 'unknown' && beer.nationality != 'misc') {
                        const flag = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        flag.innerHTML = `
                        <defs>
                            <linearGradient id="gradient-${index}">
                                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
                            </linearGradient>
                            <mask id="mask-${index}">
                                <rect x="0" y="0" width="200" height="200" fill="url(#gradient-${index})"></rect>
                            </mask>
                        </defs>
                        <image mask="url(#mask-${index})" xlink:href="/img/flags/${beer.nationality}.png"
                            width="100%" height="100%" preserveAspectRatio="none"></image>
                        `;
                        flag.classList.add('flag');
                        listElement.appendChild(flag);
                    }

                    const breweryNameSpan = document.createElement('span');
                    breweryNameSpan.textContent = beer.brewery.name;
                    breweryNameSpan.classList.add('title');
                    breweryNameSpan.classList.add('brewery');

                    const beerNameSpan = document.createElement('span');
                    beerNameSpan.textContent = beer.name;
                    beerNameSpan.classList.add('title');
                    beerNameSpan.classList.add('beer');

                    listElement.appendChild(beerNameSpan);
                    listElement.appendChild(breweryNameSpan);
                    breweriesCollection.appendChild(listElement);
                });
            });

        const group = mp.append('g');

        const statePath = group.append('path')
            .attr('d', path(d))
            .style('stroke', '#fff')
            .style('stroke-width', '1')
            .style('fill', 'rgb(213,222,217)');

        const bbox = group.select('path').node().getBBox();

        const imgWidth = bbox.width;
        const imgHeight = bbox.height;

        const defs = mp.append('defs');
        const patternId = 'details-flag';

        defs.append('pattern')
            .attr('id', patternId)
            .attr('width', 1)
            .attr('height', 1)
            .append("image")
            .attr("xlink:href", `/img/flags/${state.mostPopularNationality}.png`)
            .attr('width', imgWidth)
            .attr('height', imgHeight)
            .attr('preserveAspectRatio', 'xMidYMid slice');

        const clipId = 'details-clip';
        const clip = defs.append('clipPath')
            .attr('id', 'details-clip');

        const clipRect = clip.append('rect')
            .attr('x', 0)
            .attr('y', height)
            .attr('width', width)
            .attr('height', height);

        group.attr('clip-path', `url(#${clipId})`);

        if (state.mostPopularNationality != 'unknown') {
            statePath.style('fill', `url(#${patternId})`);
        }

        if (State.handle.stateFadeAnimationFrame) {
            cancelAnimationFrame(State.handle.stateFadeAnimationFrame);
        }

        if (State.handle.pourAnimationFrame) {
            cancelAnimationFrame(State.handle.pourAnimationFrame);
        }

        State.audio.pour.currentTime = 0;
        State.audio.pour.volume = 1;
        State.audio.pour.play();

        (function fadeIn() {
            const y = clipRect.attr('y');

            if (y > 0) {
                clipRect.attr('y', y - 2.);

                State.handle.stateFadeAnimationFrame = requestAnimationFrame(fadeIn);
            } else {
                State.handle.stateFadeAnimationFrame = null;

                (function fadeOutAudio() {
                    const vol = State.audio.pour.volume;

                    if (vol > 0) {
                        State.audio.pour.volume = Math.max(vol - 0.02, 0);

                        State.handle.pourAnimationFrame = requestAnimationFrame(fadeOutAudio);
                    } else {
                        State.audio.pour.pause();

                        State.handle.pourAnimationFrame = null;
                    }
                })();
            }
        })();

        

        group.selectAll('circle')
            .data(state.nationalityCities)
            .enter()
            .append('circle')
            .attr('r', '7')
            .attr('cx', function cx({ lat, lng }) {
                return projection([lng, lat])[0];
            })
            .attr('cy', function cx({ lat, lng }) {
                return projection([lng, lat])[1];
            })
            .style('stroke', 'white')
            .style('stroke-width', 1)
            .style('fill', '#F44336')
            .on("mouseover", function(d) {
                d3.select(this).attr('r', 9);
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.text(d.city)
                   .style("left", (d3.event.pageX) + "px")     
                   .style("top", (d3.event.pageY - 28) + "px");    
            })   
            .on("mouseout", function(d) { 
                d3.select(this).attr('r', 7);
                div.transition()        
                   .duration(500)      
                   .style("opacity", 0);   
            })
            .on('click', function(d) {
                let el;
                document.querySelectorAll('.city-name-element > div').forEach(node => {
                    if (node.textContent == d.city) {
                        el = node;
                    }
                })
                el.scrollIntoView();
            })

        const otherCities = state.cities.filter(city => state.nationalityCities.find(c => c.city == city.city) == undefined)

        group.selectAll('circle.other')
            .data(otherCities)
            .enter()
            .append('circle')
            .attr('r', '5')
            .attr('cx', function cx({ lat, lng }) {
                return projection([lng, lat])[0];
            })
            .attr('cy', function cx({ lat, lng }) {
                return projection([lng, lat])[1];
            })
            .style('stroke', 'white')
            .style('stroke-width', 1)
            .style('fill', 'black')
            .on("mouseover", function(d) {
                d3.select(this).attr('r', 8);
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.text(d.city)
                   .style("left", (d3.event.pageX) + "px")     
                   .style("top", (d3.event.pageY - 28) + "px");    
            })   
            .on("mouseout", function(d) { 
                d3.select(this).attr('r', 5);
                div.transition()        
                   .duration(500)      
                   .style("opacity", 0);   
            })
            .on('click', function(d) {
                let el;
                document.querySelectorAll('.city-name-element > div').forEach(node => {
                    if (node.textContent == d.city) {
                        el = node;
                    }
                })
                el.scrollIntoView();
            })
    }

    function resetMainMap() {
        const mp = document.querySelector('.us-map > svg');

        while (mp.firstChild) {
            mp.removeChild(mp.firstChild);
        }

        State.elements.defs = State.elements.mainMap.append('defs');

        State.elements.mainMap.selectAll('path')
            .data(State.data.geometry.features)
            .enter()
            .append('path')
            .attr('d', State.mainMap.path)
            .style('stroke', '#fff')
            .style('stroke-width', '1')
            .style('fill', 'rgb(213,222,217)')
            .on('click', function(d) {
                const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                const state = State.data.dataset.state.aggregate[abbreviation];

                showDetailsView(d, state);
            })

        State.elements.mainMap.selectAll('path')
            .style('fill', (d, index, elements) => {
                const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                const state = State.data.dataset.state.aggregate[abbreviation];

                if ((!state) || (state.mostPopularNationality == 'unknown')) {
                    return 'rgb(213,222,217)';
                }

                const { height, width } = d3.select(elements[index]).node().getBBox();

                const id = `flag-${index}`;

                State.elements.defs.append('pattern')
                    .attr('id', id)
                    .attr('width', 1)
                    .attr('height', 1)
                    .append("image")
                    .attr("xlink:href", `/img/flags/${state.mostPopularNationality}.png`)
                    .attr('width', width)
                    .attr('height', height)
                    .attr('preserveAspectRatio', 'xMidYMid slice');

                return `url(#${id})`;
            })
            .style('fill-opacity', (d, index, elements) => {
                const abbreviation = State.data.dataset.inverseStateMap[d.properties.name];
                const state = State.data.dataset.state.aggregate[abbreviation];

                if ((!state) || (state.mostPopularNationality == 'unknown')) {
                    d.origOpacity = 0.7;
                } else {
                    const { min, max } = State.data.dataset.nationalityCityPopularity[state.mostPopularNationality];

                    d.origOpacity = opacityLerp(min, max, state.nationalityCount);
                }

                return d.origOpacity;
            })
            .on('mouseover', function (d) {
                d3.select(this)
                    .style('fill-opacity', 1.0);
            })
            .on('mouseleave', function (d) {
                d3.select(this)
                    .style('fill-opacity', d.origOpacity );
            })

        const cities = Object.values(State.data.dataset.state.aggregate)
            .map(state => state.nationalityCities)
            .reduce((acc, curr) => acc.concat(curr), []);

        State.elements.mainMap.selectAll('circle')
            .data(cities)
            .enter()
            .append('circle')
            .attr('r', '3')
            .style('fill', '#F44336')
            .style('pointer-events', 'none')
            .style('stroke', 'white')
            .style('stroke-width', 1)
            .attr('cx', function cx({ lat, lng }) {
                return State.mainMap.projection([lng, lat])[0];
            })
            .attr('cy', function cx({ lat, lng }) {
                return State.mainMap.projection([lng, lat])[1];
            });
    }

    function opacityLerp(min, max, value) {
        const MAX = 0.825;
        const MIN = 0.2;

        if (max == min) {
            return MAX;
        }

        const t = value / (max - min);

        return (1 - t) * MIN + t * MAX;
    }
})();

