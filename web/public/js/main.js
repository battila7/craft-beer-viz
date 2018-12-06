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

    State.elements.mainMap.selectAll('path')
        .data(State.data.geometry.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('stroke', '#fff')
        .style('stroke-width', '1')
        .style('fill', 'rgb(213,222,217)');

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
})();
