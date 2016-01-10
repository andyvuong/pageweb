var height = 500;
var width = 500;
var color = d3.scale.category20();

var force = d3.layout.force()
.linkDistance(120)
.size([width, height]);

var svg = d3.select("#panel").append("svg")
.attr("width", width)
.attr("height", height);

$( "#dataTable tbody tr" ).on( "click", function() {
    d3.json("crawl", function(error, json) {
        data = json;
        generateVisualization(data, force, svg, color, width, height);
    })
    .header("Content-Type","application/json")
    .send("POST", JSON.stringify({input: "http://andyvuong.me", limit: "10"}));
});


var generateVisualization = function(data) {
    var links = data.links;
    var nodes = data.nodes;

    var force = d3.layout.force()
        .size([width, height])
        .nodes(nodes)
        .links(links)
        .start();

    var link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });

    var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("id", function(d) { return "id" + d.index; } ) // add ids to modify specific domains
        .attr("class", "node")
        .attr("r", 5)
        .style("fill", function(d) { return color(d.group); })
        .call(force.drag)
        .on("click", function(d) {
          // placeholder
        });

    // make the original domain larger
    d3.select("#id0").attr("r", 10);

    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      });
};