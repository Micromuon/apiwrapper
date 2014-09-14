var assert = require("assert"),
    request = require("superagent"),
    setTimeout = require("timers").setTimeout,
    NRP = require("node-redis-pubsub-fork"),
    pubsubChannel = new NRP({ scope: "messages" });

var repoUrl = "gitlab@git.bskyb.com:sea-microservices/microservices-testservice.git";
var repoName = "sea-microservices/microservices-testservice";
var host = "http://localhost:11000";
var correctHealthcheck = {url: "http://localhost:16000", frequency: "*/1 * * * * *", expectedResBody: "We are the knights who say ni", expectedResStatus: 200};
var correctAlerting = {emails: ["sea.microservices2@gmail.com", "sea.microservices@gmail.com"], frequency: "10"};

process.env.npm_config_port = 11000;

require("../wrapperapi");

describe("test deployer api calls", function() {
    it('puts to deployer/deploy', function(done) {
        var path = host + '/deployer/deploy';
        pubsubChannel.once("deployer:deploy", function(data) {
            assert.equal(data.url, repoUrl);
            pubsubChannel.emit("deployer:deployResult", {url: repoUrl});
        });
        var postData = {url: repoUrl};
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
        }, done, postData);
    });
    
    it('sends deployer:start message on PUT request', function(done){
        var path = host + '/deployer/start/'+repoName;
        pubsubChannel.on("deployer:start", function(data) {     
            pubsubChannel.emit("deployer:startResult", { name: repoName, url: repoUrl, path: "test", status: "running" });
            console.log("received message: " + data.name);
            assert.equal(repoName, data.name);
        });
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
        }, done);
    });
    
    it('sends deployer:stop message on PUT request', function(done){
        var path = host + '/deployer/stop/'+repoName;
        pubsubChannel.on("deployer:stop", function(data) {
                pubsubChannel.emit("deployer:stopped", { name: repoName, url: repoUrl, path: "test", status: "deployed" });
                console.log("received message: " + data.name);
                assert.equal(repoName, data.name);
            });
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
        }, done);
    });
    
    it('sends deployer:delete message on PUT request to /deployer/delete/'+repoName, function(done){
        var path = host + '/deployer/delete/'+repoName;
        pubsubChannel.on("deployer:delete", function(data) { 
                pubsubChannel.emit("deployer:deleted", { name: repoName, url: repoUrl, path: "test", status: "deployed" });
                console.log("received message: " + data.name);
                assert.equal(repoName, data.name);
            });
        sendReq('del', path, function(res) {
            assert.equal(200, res.status);
        }, done);
    });
    
});

describe("test discovery api calls", function() {    
    it('sends query to discovery and waits for response', function(done) {
        this.timeout(5000);
        var path = host + '/discovery/getInfo/'+ repoName;
        pubsubChannel.once("discovery:getInfo", function(data) {
            pubsubChannel.emit("discovery:serviceInfo", { serviceName: repoName, url: repoUrl, path: "test", status: "deployed" });
            assert.equal(data.name, repoName);
            console.log("received message: " + data.name);
        });
        sendReq('get', path, function(res) {
            assert.equal(200, res.status);
            console.log(res.status);
            assert.equal(res.body.serviceName, repoName);
            console.log("Information of requested service: ");
            console.log(res.body);
        }, done);
    });  
});

describe("test healthcheck api calls", function() {
    it('sends query to submit a new healthcheck', function(done) {
        var path = host + '/healthcheck/submit';
        pubsubChannel.once("healthcheck:submit", function(data) {
            pubsubChannel.emit("healthcheck:submitResult", {name:repoName});
            assert.equal(data.name, repoName); 
            console.log("message sent: " + data.name);
        });
        var postData = correctHealthcheck;
        postData.name = repoName;
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, postData.name);
            console.log("Healthcheck submitted: " + res.body);
        }, done, postData);
    });
    
    it('updates an existing healthcheck with new data', function(done) {
        var path = host + '/healthcheck/update/' + repoName;
        pubsubChannel.once("healthcheck:update", function(data) {
            pubsubChannel.emit("healthcheck:updated", {name:repoName});
            assert.equal(data.name, repoName); 
            console.log("message sent: " + data.name);
        });
        var postData = correctHealthcheck;
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, repoName);
            console.log("Healthcheck update submitted: " + res.body);
        }, done, postData);
    });
    
    it('deletes an existing healthcheck', function(done) {
        var path = host + '/healthcheck/delete/' + repoName;
        pubsubChannel.once("healthcheck:delete", function(data) {
            pubsubChannel.emit("healthcheck:deleteResult", {name:repoName});
            assert.equal(data.name, repoName); 
            console.log("message sent: " + data.name);
        });
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
            console.log("Healthcheck update submitted: " + res.body);
        }, done);
    });
    
    it('sends query to healthcheck and waits for response', function(done) {
        var path = host + '/healthcheck/query/'+ repoName;
        pubsubChannel.once("healthcheck:queryHealth", function(data) {
            pubsubChannel.emit("healthcheck:queryHealthResult", { name: repoName, url: "test", expectedResStatus:"test", expectedResBody:"test", frequency:"test" });
            assert.equal(data.name, repoName);
            console.log("received message: " + data.name);
        });
        sendReq('get', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, repoName);
            console.log("Information of requested service: " + res.body);
        }, done);
    });  
});

describe("test alerting api calls", function() {
    it('creates the alert profiles information', function(done) {
        var path = host + '/alerting/save';
        pubsubChannel.once("alerting:saveInfo", function(data) {
            pubsubChannel.emit("alerting:saveResult", {name:repoName});
            assert.equal(data.name, repoName);
            console.log("message sent: " + data.name);
        });
        var postData = correctAlerting;
        postData.name = repoName;
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, postData.name);
            console.log("Alert profile saved: " + res.body);
        }, done, postData);
    });
    
    it('updates the alert profile with new information', function(done) {
        var path = host + '/alerting/update/' + repoName;
        pubsubChannel.once("alerting:saveInfo", function(data) {
            pubsubChannel.emit("alerting:saveResult", {name:repoName});
            assert.equal(data.name, repoName);
            console.log("message sent: " + data.name);
        });
        var postData = correctAlerting;
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, repoName);
            console.log("Updated alerting: " + res.body);
        }, done, postData);
    });
    
    it('sends query to alerting and waits for response', function(done) {
        var path = host + '/alerting/query/'+ repoName;
        pubsubChannel.once("alerting:queryAlerting", function(data) {
            pubsubChannel.emit("alerting:queryAlertingResult", {name: repoName, emails: ["sea.microservices2@gmail.com", "sea.microservices@gmail.com"], frequency: "10"});
            assert.equal(data.name, repoName);
            console.log("received message: " + data.name);
        });
        sendReq('get', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, repoName);
            console.log("Information of requested service: " + res.body);
        }, done);
    }); 
    
});

describe("test logging api calls", function() {    
    it('sends query to logging and waits for response', function(done) {
        var path = host + '/logging/query';
        pubsubChannel.once("logging:query", function(data) {
            pubsubChannel.emit("logging:queryResults", {name:repoName});
            assert.equal(data.name, repoName);
            console.log("received message: " + data.name);
        });
        var postData = {name: repoName};
        sendReq('put', path, function(res) {
            assert.equal(200, res.status);
            assert.equal(res.body.name, repoName);
            console.log("Logging: " + res.body);
        }, done, postData);
    });  

});

function sendReq(type, path, assertion, done, postData){
    console.log("***** sendReq()");
    var callback = function(res) {
        console.log("***** sendReq() callback");
        assertion(res);
        done();
    };
    if (type == 'put'){
        console.log("***** sendReq() if type == put");
        var req = request.put(path);
        req.send( postData );
        req.end(callback);
    } else if (type == 'del'){
        console.log("***** sendReq() if type == del");
        var req = request.del(path);
        req.end(callback);
    } else if (type == 'get'){
        console.log("***** sendReq() if type == get");
        var req = request.get(path);
        req.end(callback);
    }
}
