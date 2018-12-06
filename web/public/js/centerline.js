window.centerline = (function centerlineIIFE() {
  function fitnessFunction(path, length) {
    let fitness = length;

    const sinuosity = length / distanceBetween(path[0], path[path.length - 1]);

    fitness /= Math.pow(sinuosity, 2);

    return fitness;
  }

  function findClosestPolygonIntersection(start, end, polygon) {
    return polygon.reduce((best, point, i) => {
      const intersection = findIntersection(start, end, point, polygon[i + 1] || polygon[0]);
      if (intersection) {
        const distance = distanceBetween(start, intersection);
        if (!best.distance || distance < best.distance) {
          return { intersection, distance };
        }
      }
      return best;
    }, {});
  }

  function getPointsAlongPolyline(polyline, count) {
    const distances = polyline.map((p, i) =>
      distanceBetween(p, polyline[i + 1] || polyline[0])
    );
    const totalLength = d3.sum(distances);
    const step = totalLength / count;
    let traversed = 0;
    let next = step / 2;

    const done = polyline.reduce((arr, point, i) => {
      while (next < traversed + distances[i]) {
        let a = point,
          b = polyline[i + 1] || polyline[0],
          pct = (next - traversed) / distances[i];
        arr.push([a[0] + (b[0] - a[0]) * pct, a[1] + (b[1] - a[1]) * pct]);
        next += step;
      }
      traversed += distances[i];
      return arr;
    }, []);
    return done;
  }

  function findIntersection(a1, a2, b1, b2) {
    // Adapted from https://github.com/Turfjs/turf-line-slice-at-intersection
    const uaT = (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]),
      ubT = (a2[0] - a1[0]) * (a1[1] - b1[1]) - (a2[1] - a1[1]) * (a1[0] - b1[0]),
      uB = (b2[1] - b1[1]) * (a2[0] - a1[0]) - (b2[0] - b1[0]) * (a2[1] - a1[1]);

    if (uB !== 0) {
      const ua = uaT / uB,
        ub = ubT / uB;
      if (ua > 0 && ua < 1 && ub > 0 && ub < 1) {
        return [a1[0] + ua * (a2[0] - a1[0]), a1[1] + ua * (a2[1] - a1[1])];
      }
    }
  }

  function rotatePoint(point, angle, center) {

    const x2 = (point[0] - center[0]) * Math.cos(angle) - (point[1] - center[1]) * Math.sin(angle),
      y2 = (point[0] - center[0]) * Math.sin(angle) + (point[1] - center[1]) * Math.cos(angle);

    return [
      (point[0] - center[0]) * Math.cos(angle) - (point[1] - center[1]) * Math.sin(angle) + center[0],
      (point[0] - center[0]) * Math.sin(angle) + (point[1] - center[1]) * Math.cos(angle) + center[1]
    ];
  }

  function tangentAt(el, len) {
    const a = el.getPointAtLength(Math.max(len - 0.01, 0)),
      b = el.getPointAtLength(len + 0.01);

    return Math.atan2(b.y - a.y, b.x - a.x);
  }


  function distanceBetween(a, b) {
    const dx = a[0] - b[0],
      dy = a[1] - b[1];

    return Math.sqrt(dx * dx + dy * dy);
  }

  function simplify(points) {
    // Convert from [x, y] to { x, y } and back for simplify-js
    return window.simplify(points.map(p => ({ x: p[0], y: p[1] })), 8).map(p => [p.x, p.y]);
  }

  function computeCenterline(feature, projection, width, height) {
    const offset = 0.5;
    const numPerimeterPoints = 50;

    let outerRing;
    if (feature.geometry.type == 'MultiPolygon') {
      outerRing = feature.geometry.coordinates[0][0].map(projection);
    } else {
      outerRing = feature.geometry.coordinates[0].map(projection);
    }    

    const polygon = getPointsAlongPolyline(outerRing, numPerimeterPoints)

    const voronoi = (function () {
      const [x0, x1] = d3.extent(polygon.map(d => d[0])),
        [y0, y1] = d3.extent(polygon.map(d => d[1]));

      return d3.voronoi().extent([[x0 - 1, y0 - 1], [x1 + 1, y1 + 1]])(polygon).edges;
    })();

    const edges = (function () {
      return voronoi
        .filter(edge => {
          if (edge && edge.right) {
            const inside = edge.map(point => d3.polygonContains(polygon, point));
            if (inside[0] === inside[1]) {
              return inside[0];
            }
            if (inside[1]) {
              edge.reverse();
            }
            return true;
          }
          return false;
        })
        .map(([start, end] = []) => {
          const { intersection, distance } = findClosestPolygonIntersection(
            start,
            end,
            polygon
          );

          if (intersection) {
            intersection.clipped = true;
          }

          // Each edge has a starting point, a clipped end point, and an original end point
          const edge = [start, intersection || end];
          edge.distance = intersection ? distance : distanceBetween(start, end);

          return edge;
        })
    })();

    const nodes = (function () {
      const nodes = [];

      edges.forEach(edge => {
        edge.forEach((node, i) => {
          if (!i || !node.clipped) {
            const match = nodes.find(d => d === node);
            if (match) {
              return (node.id = match.id);
            }
          }
          node.id = nodes.length.toString();
          node.links = {};
          nodes.push(node);
        });
        edge[0].links[edge[1].id] = edge.distance;
        edge[1].links[edge[0].id] = edge.distance;
      });

      return nodes;
    })();

    const graph = (function () {
      const graph = new Graph();
      nodes.forEach(node => graph.addNode(node.id, node.links));
      return graph;
    })();

    const perimeterNodes = nodes.filter(d => d.clipped)

    const traversal = (function () {
      let totalBest;

      for (let i = 0; i < perimeterNodes.length; i++) {
        const start = perimeterNodes[i];
        const longestShortestPath = perimeterNodes.slice(i + 1).reduce((nodeBest, node) => {
          const path = graph.path(node.id, start.id, { cost: true });
          if (path && (!nodeBest || path.cost > nodeBest.cost)) {
            return path;
          }
          return nodeBest;
        }, null);

        if (longestShortestPath && longestShortestPath.path) {
          longestShortestPath.path = longestShortestPath.path.map(id => nodes[+id]);
          longestShortestPath.cost = fitnessFunction(longestShortestPath.path, longestShortestPath.cost);
          if (!totalBest || longestShortestPath.cost > totalBest.cost) {
            totalBest = longestShortestPath;
          }
        }
      }
      if (totalBest) {
        return {
          bestPath: totalBest.path
        };
      }
    })();

    const simplifiedLine = simplify(traversal.bestPath)

    const flipText = (function () {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

      const path = d3.select(svg)
        .append("path")
        .attr("d", "M" + simplifiedLine.join("L"))
        .node();

      const tangent = tangentAt(path, path.getTotalLength() * offset);

      return Math.abs(tangent) > Math.PI / 2;
    })();

    return d3.line().curve(d3.curveBasis)(flipText ? simplifiedLine.slice(0).reverse() : simplifiedLine);
  }

  function placeTextAlongCenterline(centerline, feature, projection, width, height, id, labeltext) {
    const measurementStep = 5;
    const offset = 0.5;
    const numPerimeterPoints = 50;

    let outerRing;

    if (feature.geometry.type == 'MultiPolygon') {
      outerRing = feature.geometry.coordinates[0][0].map(projection);
    } else {
      outerRing = feature.geometry.coordinates[0].map(projection);
    }    

    const polygon = getPointsAlongPolyline(outerRing, numPerimeterPoints)

    const bbox = (function () {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    
      const text = d3.select(svg)
        .append("text")
        .attr("class", "label")
        .style("font-size", "100px")
        .style('visibility', 'hidden')
        .text(labeltext)
        .node();

      document.querySelector('body').appendChild(svg);

      const bbox = text.getBBox();

      svg.remove();
      
      return bbox;
    })();

    const widthPerPixel = bbox.width / 100

    const aspectRatio = bbox.width / bbox.height

    const measurements = (function() {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    
      const path = d3
        .select(svg)
        .append("path")
        .attr("d", centerline)
        .node();
    
      const length = path.getTotalLength();
    
      const measurements = [];
    
      for (
        let halfwidth = 0;
        halfwidth < Math.min(length * offset, length * (1 - offset));
        halfwidth += measurementStep
      ) {
        measurements.push(
          [length * offset + halfwidth, length * offset - halfwidth]
            .map(l => {
              const { x, y } = path.getPointAtLength(l),
                tangent = tangentAt(path, l);
    
              const perpendiculars = [tangent - Math.PI / 2, tangent + Math.PI / 2]
                .map(angle =>
                  findClosestPolygonIntersection(
                    [x, y],
                    rotatePoint([x + width, y], angle, [x, y]),
                    polygon
                  )
                )
                .filter(d => d.intersection)
                .sort((a, b) => a.distance - b.distance);
    
              if (!perpendiculars.length) {
                return null;
              }
    
              const { intersection, distance } = perpendiculars[0];
    
              const line = [
                intersection,
                [2 * x - intersection[0], 2 * y - intersection[1]]
              ];
    
              line.distance = distance;
    
              return line;
            })
            .filter(d => d)
        );
      }
    
      return measurements;
    })();

    const maxFontSize = (function() {
      let ceiling = Infinity,
          maxWidth = 0;
       
      measurements.forEach((pair, i) => {
        pair.forEach(measurement => {
          ceiling = Math.min(measurement.distance, ceiling);
        });
        maxWidth = Math.max(maxWidth, 2 * Math.min(i * measurementStep, ceiling * aspectRatio));
      });
      
      return maxWidth / widthPerPixel;
     })();
    
    return `
      <path d=${centerline} id="${id}" stroke="none" fill="none" />
      <text class="label" dy="0.35em" fill="#444" style="font-size: ${maxFontSize}px;">
        <textPath xlink:href="#${id}" startOffset="50%" text-anchor="middle">${labeltext}</textPath>
      </text>`;
  }

  return {
    computeCenterline,
    placeTextAlongCenterline
  };
})();
