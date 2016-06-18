var http = require("http");
var fs = require('fs');
var connect = require("connect");
var mustache = require("mustache");
var WebSocketServer = require('websocket').server;
var ee = require("events");
var planner = new Planner(ee);

planner.on('moveTask',function(task, source){
    var msg = {};
    msg.type = 'moveTask';
    msg.args = {'task_id':task.id, 'owner': task.owner, 'status': task.status};

    var jMsg = JSON.stringify(msg);
    for (var i=0; i<clients.length; i++){ //clients变量是一个代表所连接的客户端的对象数组。每次创建一个连接,该数组就会添加一个项目。
        if (source !== clients[i].client_id){ //不需要将消息发送给发起该消息的客户端

            clients[i].ws.send(jMsg);//WebSocket 也存储在 clients数组中。
        }
    }
});
//function handler
function handler (req,res) { //响应HTTP请求
    fs.readFile(__dirname + '/websocket-sample.html',function(err,data){
        if (err) {
            res.writeHead(500);
            return res.end('Error loading websocket-sample.html');
        }
        res.writeHead(200);
        res.end(data);
    });
}

var app = http.createServer(handler);

app.listen(8080, function() {
    console.log((new Date()) + " Server is listening on port 8080");
});

wsServer = new WebSocketServer({
    httpServer: app
});

wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    console.log((new Date()) + " Connection accepted.");
    connection.on('message', function(message) {
        console.log("Received Message: " + message.utf8Data);
        connection.sendUTF(message.utf8Data);
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });
});