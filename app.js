var express = require("express");
var fs = require('fs'); // for testing
var async = require("async");
var log4js = require('log4js');
var cheerio = require("cheerio");
var request = require("request");
var validUrl = require("valid-url");
var bodyParser = require("body-parser");
var app = express();

app.use(express.static("static"));
app.use(bodyParser.json());
log4js.replaceConsole()

// important globals
var logger = log4js.getLogger();
var limits = [8, 16, 32, 64, 2];
var count = 1;
var group = 0;

/**
 * Handles the post request for crawling 
 */
app.post("/crawl", function(req, res) {
    logger.info("POST REQUEST RECEIVED. Validating user input.");
    if (!isValidRequest(req.body)) {
        logger.info("Validation failed! Sending bad request status to client.");
        return res.sendStatus(400);
    }
    logger.info("Validation successful! Beginning crawl.");

    var url = req.body.input;
    var limit = parseInt(req.body.limit);

    crawl(url, limit, function(err, results) {
        if (!err && results) {
            logger.info("Preparing to send response.");
            var dataFile = constructDataFile(results);

            logger.info("Sending response.");
            //writeFile(dataFile); // TODO remove after testing complete
            
            res.setHeader('Content-Type', 'application/json');
            return res.send(dataFile);
        }
        else {
            logger.info("Error occured. Sending bad request status to client.");
            return res.sendStatus(400);
        }
    });
});

// Server Code
var server = app.listen(process.env.PORT || 8000, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});

var writeFile = function(data) {
    fs.writeFileSync("test_f.json", data, 'utf8');
}

/**
 * Begins the crawl process from the initial provided url and scraps websites in a BFS manner from that point.
 */
var crawl = function(url, limit, call) {
    var crawlQueue = [url]; // the ordering structure used to visit scapped web links
    var nodeMap = {};
    var linkMap = [];
    nodeMap[url] = 0; // mark the origin domain as the first node in the mapping

    async.whilst(function() {
        //logger.debug(crawlQueue); // TODO - debug mapping and refactor links to use keys
        if (count >= limit) {
            return false;
        }
        return crawlQueue.length != 0;
        },
        function(callback) {
            var currentUrl = getUrl(url, crawlQueue, nodeMap);
            logger.debug("Current URL: " + currentUrl);
            requestUrl(currentUrl, crawlQueue, nodeMap, linkMap, callback);
        },
        function(err, n) { // this is the callback used by the above function, passed in as 'callback'
            if (!err && n) {
                call(null, n); // trigger another callback, oh boy.
            }
            else {
                call(null, null);
            }
        }
    );
};

// Return the next url to be processed that is not in the map already
var getUrl = function(originalUrl, crawlQueue, nodeMap) {
    var currentUrl = crawlQueue.pop();
    if (originalUrl === currentUrl) {
        return originalUrl;
    }
    else {
        while (currentUrl in nodeMap && crawlQueue.length > 0) {
            currentUrl = crawlQueue.pop();
        }
        return currentUrl;
    }
}

/**
 * Makes an http request to the given url and extracts the web links from the returned html page to add to the crawl queue
 * and add to the data objects.
 */
var requestUrl = function(currentUrl, crawlQueue, nodeMap, linkMap, callback) {
    logger.info("Sending request to: " + currentUrl);
    request(currentUrl, {timeout: 1500}, function(err, res, doc) {
        if (!err) {
            logger.info("Request to: [" + currentUrl + "] was successful! Processing.");
            var processedLinks = processPage(err, res, doc);

            updateMapping(currentUrl, processedLinks, nodeMap, linkMap);
            concatArrays(crawlQueue, processedLinks);
            
            var results = {
                queue: crawlQueue,
                links: linkMap,
                nodes: nodeMap
            }
            logger.info("Processing Completed!");
            callback(null, results);
        }
        else {
            logger.error("[ERROR] - [function: requestURL] Message:");
            logger.error(err);
            callback(null, null);
        }
    }); 
    
};



// Extract all anchor <a> values from a html page and return only the values that encode valid urls as an array.
var processPage = function(err, res, doc) {
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

// Assign each crawled url an index value in the node map. For all extracted urls, 
// create an edge between those url and the current one being processed.
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
}

// Converts the node map object to an array of objects for processing on the client side.
// Combines both node and data object into one JSON object and returns it.
var constructDataFile = function(data) {
    nodeArr = [];
    for (var key in data.nodes) {
        var urlVal = key;
        var groupValue = getRandomInt(0,10);
        nodeArr.push({ index : data.nodes[key], url: urlVal, group: groupValue});
    }
    //JSON.stringify(object, null, 4)
    return JSON.stringify({
        nodes: nodeArr,
        links: data.links
    }); //, null, 4); // TODO remove tabs after
}

// Return a random integer from min to max.
var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Concatenate the elements of the array, arr2, to the array, arr1. Modifies arr1's array.
var concatArrays = function(arr1, arr2) {
    for (var i = 0; i < arr2.length; i++) {
        arr1.push(arr2[i]);
    }
};

// Return true if the post request contains a valid URL as an input valud and a valid limit value.
var isValidRequest = function(requestBody) {
    if (requestBody) {
        var url = requestBody.input;
        var limit = parseInt(requestBody.limit);

        if (url && url.length !== 0 && validUrl.isWebUri(url) && isValidLimit(limit)) {
            return true;
        }
    }
    return false;
}

// Return true if the input is equal to a value in the array of limit values.
var isValidLimit = function(limit) {
    for (i = 0; i < limits.length; i++) {
        if (limit === limits[i]) {
            return true;
        }
    }

    return false;
} 