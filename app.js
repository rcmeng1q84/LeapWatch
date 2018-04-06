
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

function onConnection(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    // socket.on('drawing', function(data) {
    //     io.emit('drawing', data);
    //     //console.log('Data:  ' + data.x+','+data.y);
    // });

    socket.on('data', function(data) {
        io.emit('data', data);
        console.log('Data:  ' + data);
    });
    socket.on('numpad', function(data) {
        io.emit('numpad', data);
        console.log('numpad:  ' + data);
    });

    socket.on('option', function(data) {
        io.emit('option', data);
        console.log('option:  ' + data.view+','+data.scale);
    });

}

io.on('connection', onConnection);

http.listen(port, function(){
    console.log('listening on port ' + port);
});
