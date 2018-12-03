/*
 * Original map drawing and us-states.json by Michelle Chandra:
 *   http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
 */
(async function mainIIFE() {
    const SVG_WIDTH = 960;
    const SVG_HEIGHT = 500;

    // Translate to center of screen and scale down to see the entire US.
    const projection = d3.geoAlbersUsa()
        .translate([SVG_WIDTH / 2, SVG_HEIGHT / 2])
        .scale([1000]);
            
    const path = d3.geoPath().projection(projection);

    const svg = d3.select('body')
        .append('svg')
        .attr('width', SVG_WIDTH)
        .attr('height', SVG_HEIGHT);

    const statesPolygons = await fetch('data/us-states.json').then(response => response.json());

    svg.selectAll('path')
        .data(statesPolygons.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('stroke', '#fff')
        .style('stroke-width', '1')
        .style('fill', 'rgb(213,222,217)');
})();
