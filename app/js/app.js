window['ering'] = {};
window.ering.canvas = {};
window.ering.dom = {};

function updateVars() {
  window.ering.dom.switchports = $('#switchports');
  window.ering.dom.switches = $('#switches');
  window.ering.dom.downnodes = $('#downnodes');
  window.ering.dom.downlinks = $('#downlinks');
  window.ering.dom.txtswitchports = $('#txt_switchports');
  window.ering.dom.txtswitches = $('#txt_switches');
  window.ering.dom.txtdownnodes = $('#txt_downnodes');
  window.ering.dom.txtdownlinks = $('#txt_downlinks');
  window.ering.dom.txtringspeed = $('#txt_ringspeed');
  window.ering.dom.txtadjavg = $('#txt_adj_avg');

  window.ering.switchports = parseInt(window.ering.dom.switchports.val());
  if (window.ering.switchports <= 0 || isNaN(window.ering.switchports)) {
    window.ering.switchports = 64;
  }
  window.ering.switches = parseInt(window.ering.dom.switches.val());
  if (window.ering.switches <= 0 || isNaN(window.ering.switches)) {
    window.ering.switches = 128;
  }
  window.ering.downnodes = parseInt(window.ering.dom.downnodes.val());
  if (window.ering.downnodes <= 0 || isNaN(window.ering.downnodes)) {
    window.ering.downnodes = 2048;
  }
  window.ering.downlinks = parseInt(window.ering.dom.downlinks.val());
  if (window.ering.downlinks <= 0 || isNaN(window.ering.downlinks)) {
    window.ering.downlinks = 2;
  }
  window.ering.canvas.dom = $('#content');
  window.ering.canvas.size = window.ering.canvas.dom.width();
  window.ering.canvas.d3 = d3.select('#content');

  window.ering.dom.txtswitches.text(window.ering.switches + " switch(es)");
  window.ering.dom.txtswitchports.text(window.ering.switchports + " port(s)");
  window.ering.dom.txtdownnodes.text(window.ering.downnodes + " server(s)");
  window.ering.dom.txtdownlinks.text(window.ering.downlinks + " link(s)");
}

function hsv2rgb(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function computeBase(low, high, nextPorts, target) {
  // compute the base of the exponential distance function
  var base = (low + high) / 2.0;
  if (base <= low) {
    return low;
  }
  if (base >= high) {
    return high;
  }
  var realTarget = Math.floor(nextPorts * Math.pow(base, (nextPorts - 1)));
  if (realTarget < target) {
    return computeBase(base, high, nextPorts, target);
  }
  if (realTarget > target) {
    return computeBase(low, base, nextPorts, target);
  }
  return base;
}

function computeDistances(base, links, target) {
  // compute distances based on the global settings
  var i = 0;
  var t = Math.floor((i + 1) * Math.pow(base, i));
  var result = [];
  while (t <= target && i < links) {
    result.push(t);
    i++;
    t = Math.floor((i + 1) * Math.pow(base, i));
  }
  if (i < links && t > target && (result.length == 0 || result[result.length - 1] < target)) {
    result.push(target);
  }
  return result;
}

function computeAdjacency(current,distances,nodecount) {
  var inputLength = Object.keys(current).length;
  if (inputLength == nodecount) {
    var result = [];
    for (var i = 0; i < nodecount; i++) {
      result.push(current['n' + i]);
    }
    return result;
  }
  var out = current;
  $.map(current,function(distance,nodename) {
    var currentNode = parseInt(nodename.substring(1));
    $.map(distances,function(d) {
      var targetNode = (currentNode + d) % nodecount;
      if (!out.hasOwnProperty("n" + targetNode)) {
        out["n" + targetNode] = distance + 1;
      }
    });
    $.map(distances,function(d) {
      var targetNode = (currentNode + nodecount - d) % nodecount;
      if (!out.hasOwnProperty("n" + targetNode)) {
        out["n" + targetNode] = distance + 1;
      }
    });
  });
  var outputLength = Object.keys(out).length;
  if (outputLength == inputLength) {
    return out;
  }
  return computeAdjacency(out,distances,nodecount);
}

function computeVars() {
  // first of all compute the links to "following" nodes
  window.ering.ringlinks = (window.ering.switchports * window.ering.switches - window.ering.downnodes * window.ering.downlinks) / window.ering.switches;
  window.ering.downlinksPerSwitch = window.ering.switchports - window.ering.ringlinks;
  window.ering.expDistanceBase = computeBase(1,1000,window.ering.ringlinks/2,window.ering.switches/2);
  window.ering.expDinstances = computeDistances(window.ering.expDistanceBase, window.ering.ringlinks / 2, window.ering.switches / 2);
  window.ering.adj = computeAdjacency({n0:0},window.ering.expDinstances,window.ering.switches);
  window.ering.adjAvg = 0;
  window.ering.adjMax = 0;
  for (var i = 0; i < window.ering.adj.length; i++) {
      window.ering.adjAvg += window.ering.adj[i];
      window.ering.adjMax = Math.max(window.ering.adjMax, window.ering.adj[i]);
  }
  window.ering.adjAvg = (window.ering.adjAvg * 1.0) / window.ering.switches;
  var init = {};
  for (var i = 0; i < window.ering.downlinks; i++) {
    init["n" + (i * window.ering.switches/window.ering.downlinks)] = 0;
  }
  window.ering.adjFree = computeAdjacency(init,window.ering.expDinstances,window.ering.switches);
  window.ering.adjFreeAvg = 0;
  window.ering.adjFreeMax = 0;
  for (var i = 0; i < window.ering.adjFree.length; i++) {
    window.ering.adjFreeAvg += window.ering.adjFree[i];
    window.ering.adjFreeMax = Math.max(window.ering.adjFreeMax, window.ering.adjFree[i]);
  }
  window.ering.adjFreeAvg = (window.ering.adjFreeAvg * 1.0) / window.ering.switches;

  window.ering.ringSpeed = (window.ering.ringlinks / window.ering.adjAvg) / (window.ering.downlinksPerSwitch);
  window.ering.ringSpeedWorst = (window.ering.ringlinks / window.ering.adjMax) / (window.ering.downlinksPerSwitch);
  window.ering.ringFreeSpeed = (window.ering.ringlinks / window.ering.adjFreeAvg) / (window.ering.downlinksPerSwitch);
  window.ering.ringFreeSpeedWorst = (window.ering.ringlinks / window.ering.adjFreeMax) / (window.ering.downlinksPerSwitch);
  window.ering.dom.txtringspeed.text((Math.round(window.ering.ringSpeed*10000)/100.0) + "%");
  window.ering.dom.txtadjavg.text(Math.round(window.ering.adjAvg * 100) / 100.0);
}

function renderGraph() {
  console.log("render");

  var diameter = window.ering.canvas.size;
  var radius = diameter / 2; 
  var innerRadius = radius - 25;

  var arcPerNode = 360.0 / window.ering.switches;
  var radPerNode = (Math.PI * 2) / window.ering.switches;

  // generate nodes
  var nodes = [];
  for (var i = 0; i < window.ering.switches; i++) {
    nodes.push({key: "" + i, id: i});
  }
  // generate links
  var links = {};
  for (var j = 0; j < window.ering.expDinstances.length; j++) {
    for (var i = 0; i < window.ering.switches; i++) {
      var src = i;
      var dst = (src + window.ering.expDinstances[j]) % window.ering.switches;
      if (dst < src) {
        var tmp = src;
        src = dst;
        dst = tmp;
      }
      links[src + "-" + dst] = true;
    }
  }
  links = $.map(Object.keys(links), function(e) {
    var a = e.split("-");
    return {src: parseInt(a[0]), dst: parseInt(a[1])};
  });
  links.sort(function(l,r) {
    var dl = Math.min(l.dst - l.src,l.src + window.ering.switches - l.dst);
    var dr = Math.min(r.dst - r.src,r.src + window.ering.switches - r.dst);
    if (dl < dr) return -1;
    if (dl > dr) return 1;
    if (l.src < r.src) return -1;
    if (l.src > r.src) return 1;
    if (l.dst < r.dst) return -1;
    if (l.dst > r.dst) return 1;
    return 0;
  });

  // avg src/dst -> hue
  // min(src -> value, dst -> value) -> value
  // distance -> sat

  // clear graph + setup
  window.ering.canvas.d3.selectAll("*").remove();
  var svg = window.ering.canvas.d3.append("g").attr("transform", "translate(" + radius + "," + radius + ")");

  var node = svg.append("g").selectAll(".node");
  var link = svg.append("g").selectAll(".link");

  var computeColor = function(d) {
      var src = d.src;
      var dst = d.dst;
      var hue = d.src + Math.min(dst - src,src + window.ering.switches - dst) / 2.0;
      if (hue > window.ering.switches) {
        hue = (hue - window.ering.switches) / window.ering.switches;
      } else {
        hue = hue / window.ering.switches;
      }
      var saturation = 0.25 + (2.0 + Math.min(Math.cos(src * radPerNode), Math.sin(dst * radPerNode))) / 4;
      var value = 0.5 + (2.0 + Math.min(Math.sin(src * radPerNode), Math.cos(dst * radPerNode))) / 6;

      var rgb = hsv2rgb(hue,saturation,value);

      return d3.rgb(rgb.r,rgb.g,rgb.b);    
  };

  // add all nodes
  node = node.data(nodes)
    .enter().append("text")
      .attr("class", "node")
      .attr("dy", ".31em")
      .attr("transform", function(d) { return "rotate(" + (d.id * arcPerNode - 90) + ")translate(" + innerRadius + ",0)" + (d.id * arcPerNode < 180 ? "" : "rotate(180)"); })
      .style("text-anchor", function(d) { return d.id * arcPerNode < 180 ? "start" : "end"; })
      .text(function(d) { return d.key; })
      .on('mouseover', function(d) {
        svg.selectAll(".n" + d.id).style({opacity: 1.0, 'stroke-width': '2px'}).attr('stroke', function(d) {
          var src = d.src;
          var dst = d.dst;
          var hue = d.src + Math.min(dst - src,src + window.ering.switches - dst) / 2.0;
          if (hue > window.ering.switches) {
            hue = (hue - window.ering.switches) / window.ering.switches;
          } else {
            hue = hue / window.ering.switches;
          }
          var saturation = 0.5 + (2.0 + Math.min(Math.cos(src * radPerNode), Math.sin(dst * radPerNode))) / 6;
          var value = (2.0 + Math.min(Math.sin(src * radPerNode), Math.cos(dst * radPerNode))) / 6;
          var rgb = hsv2rgb(hue,saturation,value);
          return d3.rgb(rgb.r,rgb.g,rgb.b);
        });
      })
      .on('mouseout', function(d) {
        svg.selectAll(".n" + d.id).style({opacity: 0.5, 'stroke-width': '1px'}).attr('stroke', computeColor);
      });

  link = link.data(links)
    .enter().append("path")
    .attr("d", function(d) {
      var src = d.src;
      var dst = d.dst;
      var y1 = -Math.cos(src * radPerNode) * (innerRadius - 2);
      var x1 = Math.sin(src * radPerNode) * (innerRadius - 2);
      var y2 = -Math.cos(dst * radPerNode) * (innerRadius - 2);
      var x2 = Math.sin(dst * radPerNode) * (innerRadius - 2);
      var tension = (Math.min(dst - src,src + window.ering.switches - dst) - 1) * 2.0 / (window.ering.switches);
      tension = tension * tension;
      return d3.svg.line()
        .interpolate("bundle")
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .tension(tension)([{x:x1,y:y1},{x:x1*tension,y:y1*tension},{x:x2*tension,y:y2*tension},{x:x2,y:y2}]);
    })
    .attr("class", function(d) {
      return "n" + d.src + " n" + d.dst;
    })
    .attr('stroke', computeColor);
}

function render() {
  updateVars();
  computeVars();
  renderGraph();
}

