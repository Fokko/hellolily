var http = require('http'),
    httpProxy = require('http-proxy');

process.on('uncaughtException', function (err) {
    console.log(err);
});

//// websockets

var WebSocketServer = require("ws").Server;
var express = require("express");
var app = express();

var webSocketPort = 9000;
if (process.env.PORT == webSocketPort) {
    webSocketPort++;
}

var socketServer = http.createServer(app);
socketServer.listen(webSocketPort);

console.log("http server listening on %d", webSocketPort);

var wss = new WebSocketServer({server: socketServer});
console.log("websocket server created");

wss.on("connection", function(ws) {
  var id = setInterval(function() {
    ws.send(JSON.stringify(new Date()), function() {  })
  }, 1000);

  console.log("websocket connection open");

  ws.on("close", function() {
    console.log("websocket connection close");
    clearInterval(id);
  })
});


//
// Create a proxy server with custom application logic
//

var djangoTarget;
var nodeWsTarget;

if (process.env.DEBUG == '1') {
    djangoTarget = {
        host: 'django',
        port: 8000
    };

    nodeWsTarget = {
        host: 'localhost',
        port: 9000,
        ws: true
    }
} else {
    djangoTarget = {
        host: '0.0.0.0',
        port: process.env.DJANGO_PORT
    };

    nodeWsTarget = {
        host: '0.0.0.0',
        port: webSocketPort,
        ws: true
    }
}

var django = new httpProxy.createProxyServer({
    target: djangoTarget
});
var node = new httpProxy.createProxyServer({
    target: nodeWsTarget
});
//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function(req, res) {
    django.web(req, res);
});

server.on('upgrade', function (req, socket, head) {
    node.ws(req, socket, head);
});

var nodePort = process.env.PORT || 8001;
console.log('listening on port ' + nodePort);
server.listen(nodePort);
