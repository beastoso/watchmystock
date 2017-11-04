'use strict';

require('dotenv').load();

var http = require('http');
var express = require('express');
var mongoose = require('mongoose');
var routes = require('./app/routes/index.js');
var socket = require('socket.io');
var StockLibrary = require('./app/controllers/stockController.server.js');

var clients = [];

var app = express();

mongoose.connect(process.env.MONGO_URI);
mongoose.Promise = global.Promise;

app.use('/controllers', express.static(process.cwd() + '/app/controllers'));
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/common', express.static(process.cwd() + '/app/common'));

routes(app);

var port = process.env.PORT || 8080;
var server = http.createServer(app);
app.server = server;
server.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});

var io = socket(server);

io.on('connection', function (socket) {
  console.log('new websocket client connected');
  clients.push(socket);
  
  socket.on('notify', function (data) {
    var message = JSON.parse(data);
    console.log('message received from client: '+message);
    if (message == "added" || message == "removed") {
        StockLibrary.getHistoryForCurrentStocks(function(err, data) {
          if (err) return;
          else {
            // broadcast message to all connected clients
            var json = JSON.stringify(data);
            for (var i=0; i < clients.length; i++) {
              clients[i].emit('news',json);
            }
	      	}
        });
      }
  });
});