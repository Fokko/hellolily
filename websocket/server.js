var WebSocketServer = require('ws').Server;
var express = require('express');
var http = require('http');
var redis = require('redis');
var httpProxy = require('http-proxy');
var url = require('url');

process.on('uncaughtException', function (err) {
    console.log(err);
});

//// WebSocket


var app = express();
var webSocketPort = 9000;
if (process.env.PORT == webSocketPort) {
    webSocketPort++;
}

var socketServer = http.createServer(app);
socketServer.listen(webSocketPort);

console.log('http server listening on %d', webSocketPort);

var wss = new WebSocketServer({server: socketServer});
console.log('websocket server created');

var clients = [];
wss.on('connection', function(socket) {

    console.log('websocket connection open');
    clients.push(socket);

    var pingInterval = setInterval(function (){
        socket.send(JSON.stringify('ping'));
    }, 10000);

    socket.on('close', function() {
        console.log('websocket connection close');
        clients.splice(clients.indexOf(socket), 1);
        clearInterval(pingInterval);
    });
});

///// Redis

var redisClient;
if (process.env.REDISTOGO_URL) {
    var rtg   = url.parse(process.env.REDISTOGO_URL);
    redisClient = redis.createClient(rtg.port, rtg.hostname);
    redisClient.auth(rtg.auth.split(':')[1]);
} else {
    redisClient = redis.createClient(6379, 'redis');
}

redisClient.subscribe('test channel');
redisClient.on('message', function (channel, message) {
    console.log('redis message on node server');
    // Broadcast the message to all connected clients on this server.
    for (var i=0; i<clients.length; i++) {
        clients[i].send(JSON.stringify(message));
    }
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
var server = http.createServer(function(req, res) {
    django.web(req, res);
});

server.on('upgrade', function (req, socket, head) {
    node.ws(req, socket, head);
});

var nodePort = process.env.PORT || 8001;
console.log('listening on port ' + nodePort);
server.listen(nodePort);
