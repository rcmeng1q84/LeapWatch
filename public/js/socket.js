'use strict';

(function() {

  var socket = io();


  var current = {
    color: 'black'
  };
  var drawing = false;


  socket.on('drawing', onDrawingEvent);



  function sendPos(x0, y0, x1, y1, color){

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }


  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){

    sendPos(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }



})();
