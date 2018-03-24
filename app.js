
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
    socket.on('drawing', function(data) {
        io.emit('drawing', data);
        console.log('Data:  ' + data.x+','+data.y);
    });

}

io.on('connection', onConnection);

http.listen(port, function(){
    console.log('listening on port ' + port);
});
