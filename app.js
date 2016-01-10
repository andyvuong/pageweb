var express = require("express");
var async = require("async");
var cheerio = require("cheerio");
var request = require("request");
var validUrl = require("valid-url");
var bodyParser = require("body-parser");
var app = express();

app.use(express.static("static"));
app.use(bodyParser.json());

var count = 1;
var group = 0;

app.post("/crawl", function(req, res) {
    if (req.body) {
        var domain = req.body.input;
        var limit = req.body.limit;
    }
    else {
        response.sendStatus(400);
    }

    var nodeMap = {};
    var linkMap = [];
    var crawlQueue = [domain];

    nodeMap[domain] = 0;
    crawl(domain, limit, nodeMap, linkMap, crawlQueue, function(err, results) {
        if (!err) {

            var dataFile = constructDataFile(results);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(dataFile));
        }
        else {
            return res.sendStatus(400);
        }
    });
});

var constructDataFile = function(data) {
    nodeArr = [];
    for (var key in data.nodes) {
        var urlVal = key;
        var groupValue = getRandomInt(0,10);
        nodeArr.push({ index : data.nodes[key], url: urlVal, group: groupValue});
    }

    return {
        nodes: nodeArr,
        links: data.links
    };
}

/**
 * Begins the crawl process by scrapping the anchors on the initial input page. Note, input validation should be performed prior
 * to calling this function.
 * @return {boolean} Return true if the crawl is successful.
 */
var crawl = function(domain, limit, nodeMap, linkMap, crawlQueue, call) {
    async.whilst(function() {
        return count <= limit && crawlQueue.length != 0;
        },
        function(callback) {
            var currentUrl = crawlQueue.pop();
            requestUrl(currentUrl, crawlQueue, nodeMap, linkMap, callback);
        },
        function(err, n) {
            if (!err) {
                //console.log("results:" + n.links.length);
                call(null, n);
            }
            else {
                call(false, null);
            }
        }
    );
};

var requestUrl = function(currentUrl, crawlQueue, nodeMap, linkMap, callback) {
    request(currentUrl, function(err, response, doc) {
        var processedLinks = processPage(err, response, doc);
        count = updateMapping(currentUrl, processedLinks, nodeMap, linkMap);
        concat(crawlQueue, processedLinks);
        var results = {
            queue: crawlQueue,
            links: linkMap,
            nodes: nodeMap
        }
        callback(null, results);
    }); 
};

var concat = function(arr1, arr2) {
    for (var i = 0; i < arr2.length; i++) {
        arr1.push(arr2[i]);
    }
};

// extracts all of the valid URLs from the current page.
var processPage = function(err, response, doc) {
    var $ = cheerio.load(doc);
    var links = $("a");
    var validLinks = [];
    $(links).each(function(i, link) {
        var str = $(link).attr("href");
        if (str && validUrl.isWebUri(str)) {
            validLinks.push(str);
        }
    });
    return validLinks;
};

var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// updates the node mapping which maps unique URLs to their current index value in the map.
// updates the link mapping which maps one index to another index if there exists a link between the two.
var updateMapping = function(currentUrl, links, nodeMap, linkMap) { 
    for (var i = 0; i < links.length; i++) {
        if (!(links[i] in nodeMap)) {
            nodeMap[links[i]] = count++;
        }
    }

    for (var i = 0; i < links.length; i++) { // not duplicate edges wll exist for now
        if (links[i] in nodeMap) {
            linkMap.push({ source: nodeMap[currentUrl], target: nodeMap[links[i]] });
        }
    }
    return count;
}


var server = app.listen(8000, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});