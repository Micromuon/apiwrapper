var restify = require('restify');
var port = process.env.npm_config_port;

var NRP = require("node-redis-pubsub-fork"),
    pubsubChannel = new NRP({ scope: "messages" });

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());
server.use(restify.fullResponse());

server.listen(port, function() {
    console.log('wrapperAPI listening at %s', server.url);
});

//get root
server.get('/', function(req, res) {
    console.log("root GET /");
    res.send({"_links": { "self": { "href": "/" }, "deployer": {"href": '/deployer'}, "discovery": {"href": '/discovery'}, "healthcheck": {"href": '/healthcheck'}, "alerting": {"href": '/alerting'}, "logging": {"href": '/alerting'}}});
});

//get deployer
server.get('/deployer', function(req, res) {
    console.log("GET /deployer");
    res.send({"_links": { "self": { "href": "/deployer" }, "deployer:delete": {"href": '/deployer/delete/:gitName/:serviceName'}, "deployer:deploy": {"href": '/deployer/deploy'}, "deployer:start": {"href": '/deployer/start'}, "deployer:start": {"href": '/deployer/start'}, "deployer:stop": {"href": '/deployer/stop'}}});
});

//PUT service to deployer/deploy
server.put('/deployer/deploy', function(req, res) {
    var payload = req.params;  
    pubsubChannel.onceIf("deployer:deployResult", function(data) {
        if(data.failed == "true"){
            res.status = 500;
            res.send(data);
        } else {
            res.send(data);
        }
    }, "url", payload.url);
    console.log("deployer PUT /deploy/" + payload.url);
    pubsubChannel.emit("deployer:deploy", {url: payload.url});
});

//PUT service to deployer start
server.put('/deployer/start/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    pubsubChannel.onceIf("deployer:startResult", function(data) {
        if (data.failed == "true") {
            res.status = 500;
            res.send(data); 
        } else {
            res.send(data);
        }
    },"name", svcName);
    console.log("deployer PUT /start/" + svcName);
    pubsubChannel.emit("deployer:start", {name: svcName});
});

//PUT service to deployer stop
server.put('/deployer/stop/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    pubsubChannel.onceIf("deployer:stopped", function(data) {
        res.send(data);
    }, "name", svcName);
    console.log("PUT deployer/stop/" + svcName);
    pubsubChannel.emit("deployer:stop", {name: svcName});
});

//delete service using DEL
server.del('/deployer/delete/:gitName/:serviceName/', function(req, res) {
    console.log("inside request bit");
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    console.log("serviceName: " + svcName);
    pubsubChannel.onceIf("deployer:deleted", function(data) {
       res.send(data);
    }, "name", svcName);
    console.log("DEL deployer/delete/" + svcName);
    pubsubChannel.emit("deployer:delete", {name: svcName});
//    res.send("hello");
});

//GET discovery
server.get('/discovery', function(req, res) {
    console.log("GET /discovery");
    res.send({"_links": { "self": { "href": "/discovery" }, "discovery:getInfo": {"href": '/discovery/getInfo'}}});
});

//GET service to discovery getInfo
server.get('/discovery/getInfo/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    pubsubChannel.onceIf("discovery:serviceInfo", function(data) {
        res.send(data);
    }, "serviceName", svcName);
    console.log("GET discovery/getInfo/" + svcName);
    pubsubChannel.emit("discovery:getInfo", {name: svcName});
});

//GET service to discovery getInfo for all
server.get('/discovery/getInfo', function(req, res) {
    pubsubChannel.once("discovery:services", function(data) {
        res.send(data);
    });
    console.log("GET discovery/getInfo");
    pubsubChannel.emit("discovery:getServices", {});
});

//get healthcheck
server.get('/healthcheck', function(req, res) {
    console.log("GET /healthcheck");
    res.send({"_links": { "self": { "href": "/healthcheck" }, "healthcheck:submit": {"href": '/healthcheck/submit'}, "healthcheck:update": {"href": '/healthcheck/update/:gitName/:serviceName/'}, "healthcheck:delete": {"href": 'healthcheck/delete/:gitName/:serviceName/'}}});
});

//PUT service to healthcheck for submission
server.put('/healthcheck/submit', function(req, res) {
    var payload = req.params;
    pubsubChannel.onceIf("healthcheck:submitResult", function(data) {
        if(data.failed == "true") {
            res.status = 500;
            res.send(data);
        } else {
            res.send(data);
        }
    }, "name", payload.name);
    console.log("healthcheck PUT /" + payload.name);
    pubsubChannel.emit("healthcheck:submit", payload);
});

//PUT service to healthcheck for updates
server.put('/healthcheck/update/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    var payload = req.params;
    payload.name = svcName;
    pubsubChannel.onceIf("healthcheck:updateResult", function(data) {
        if (data.failed == "true") {
            res.status = 500;
            res.send(data); 
        } else {
            res.send(data);
        }
    }, "name", svcName);
    console.log("healthcheck PUT /" + svcName);
    console.log(payload);
    pubsubChannel.emit("healthcheck:update", payload);
});

//DEL service to healthcheck for deletes
server.put('/healthcheck/delete/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    pubsubChannel.onceIf("healthcheck:deleteResult", function(data) {
        if (data.failed == "true") {
            res.status = 500;
            res.send(data); 
        } else {
            res.send(data);
        }
    }, "name", svcName);
    console.log("healthcheck DEL /" + svcName);
    pubsubChannel.emit("healthcheck:delete", {name: svcName});
});

//GET healthcheck settings for service
server.get('/healthcheck/query/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    pubsubChannel.onceIf("healthcheck:queryHealthResult", function(data) {
        res.send(data);
    }, "name", svcName);
    console.log("GET healthcheck/query/" + svcName);
    pubsubChannel.emit("healthcheck:queryHealth", {name: svcName});
});


//get alerting
server.get('/alerting', function(req, res) {
    console.log("GET /alerting");
    res.send({"_links": { "self": { "href": "/alerting" }, "alerting:save": {"href": '/alerting/save'}, "alerting:update": {"href": "/alerting/update/:gitName/:serviceName"}}});
});

//GET alerting settings for service
server.get('/alerting/query/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    pubsubChannel.onceIf("alerting:queryAlertingResult", function(data) {
        res.send(data);
    }, "name", svcName);
    console.log("GET alerting/query/" + svcName);
    pubsubChannel.emit("alerting:queryAlerting", {name: svcName});
});


//PUT service to alerting for saving
server.put('/alerting/save', function(req, res) {
    var payload = req.params;
    pubsubChannel.onceIf("alerting:saveResult", function(data) {
        if (data.failed == "true") {
            res.status = 500;
            res.send(data); 
        } else {
            res.send(data);
        }
    }, "name", payload.name);
    console.log("alerting PUT /" + payload.name);
    pubsubChannel.emit("alerting:saveInfo", payload);
});

//PUT service to alerting for updating
server.put('/alerting/update/:gitName/:serviceName/', function(req, res) {
    var svcName = req.params.gitName + "/" + req.params.serviceName;
    var payload = req.params;
    payload.name = svcName;
    pubsubChannel.onceIf("alerting:saveResult", function(data) {
        if (data.failed == "true") {
            res.status = 500;
            res.send(data); 
        } else {
            res.send(data);
        }
    }, "name", payload.name);
    console.log("alerting PUT /" + payload.name);
    pubsubChannel.emit("alerting:saveInfo", payload);
});

//PUT query to logging
server.put('/logging/query', function(req, res) {
    var payload = req.params;
    pubsubChannel.once("logging:queryResults", function(data) {
        if (data.name == payload.name) 
            res.send(data); 
    });
    console.log("logging PUT /query");
    pubsubChannel.emit("logging:query", payload);
});