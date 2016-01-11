var height = 500;
var width = 500;
var color = d3.scale.category20();

var force = d3.layout.force()
.linkDistance(620)
.size([width, height]);

var r = 6;
var svg = d3.select("#panel").append("svg")
.attr("width", width)
.attr("height", height);

$("#sample-1").on("click", function(e) {
    e.preventDefault();
    d3.json("samples/sample_av_32.json", function(error, json) {
        svg.selectAll("*").remove();
        data = json;
        generateVisualization(data, force, svg, color, width, height);
        generateStats(data);  
    });
});

$("#sample-2").on("click", function(e) {
    e.preventDefault();
    d3.json("samples/sample_sk_64.json", function(error, json) {
        svg.selectAll("*").remove();
        data = json;
        generateVisualization(data, force, svg, color, width, height);
        generateStats(data);  
    });
});

$("#sample-3").on("click", function(e) {
    e.preventDefault();
    d3.json("samples/sample_wk_64.json", function(error, json) {
        svg.selectAll("*").remove();
        data = json;
        generateVisualization(data, force, svg, color, width, height);
        generateStats(data);  
    });
});

$("#submit").on("click", function(e) {
    e.preventDefault();
    if (!$("#submit").hasClass("buttonActive")) {
        console.log("launching function");
        $("#submit").addClass("buttonActive");
        $("#submit").text("Please Wait");

        var inputVal = $("#inputBox").val();
        var limitVal = $("#selection").find("option:selected").text();


        d3.json("crawl", function(error, json) {
            if (!error) {
                svg.selectAll("*").remove();
                data = json;
                generateVisualization(data, force, svg, color, width, height);
                generateStats(data);  
            }
            else {
                console.log("Please try again");
                $("#submit").removeClass("buttonActive");
                $("#submit").text("Visualize"); 
            }
            $("#submit").removeClass("buttonActive");
            $("#submit").text("Visualize"); 
        })
        .header("Content-Type","application/json")
        .send("POST", JSON.stringify({input: inputVal, limit: limitVal}));
    }
    else {
        console.log("Please Wait!");
    }
});

/*
d3.json("test4.json", function(error, json) {
        if (!error) {
            data = json;
            generateVisualization(data, force, svg, color, width, height);  
            generateStats(data);
        }
        else {
            console.log("Please try again");
        }
    })
*/
var generateStats = function(data) {
    var links = data.links;
    var nodes = data.nodes;
    var nodeCount = Object.keys(nodes).length;
    var linkCount = Object.keys(links).length;
    $("#statistics").text(nodeCount + " nodes | " + linkCount + " links");;
}

var generateVisualization = function(data) {
    var links = data.links;
    var nodes = data.nodes;

    var force = d3.layout.force()
        .size([width, height])
        .charge(-800)
        .friction(0.9)
        .gravity(0.5)
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
        .attr("r", r)
        .style("fill", function(d) { return color(d.group); })
        .call(force.drag)
        .on("click", function(d) {
            $("#panel-text").empty();
            $("#panel-text").append("<a href=" + d.url + ">" + d.url + "</a>"); //text(d.url);
        });

    // make the original domain larger
    d3.select("#id0").attr("r", 12);

    force.on("tick", function() {

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x = Math.max(r, Math.min(width - r, d.x)); })
            .attr("cy", function(d) { return d.y = Math.max(r, Math.min(height - r, d.y)); });
      });
};