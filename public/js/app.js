'use strict';

var app;

var cursorDefaultColor = '#40d58e';
var cursorEventColor = '#9bffec';

$(function () {


    app = new Vue({
        el      : '#app',
        data    : {
            platform       : '0',
            leapStatus     : false,
            socketStatus   : false,
            message        : 'Hello Vue!',
            frameData      : '0',
            pointableString: '0',
            trackingStatus: false,
            cursorPosString: '0',
            cursorPosArray : [],
            cursorLevel    : 0, //3-overview. 2-browsing. 1-action. 0-out of range
            cursorName     : '',
            currentFolder  : {
                name: 'Daily',
                translatePos: [-64,38]
            },
            appInfo        : {
                currentGesturef: '',
                lastGesture   : '',


            },
            appControl     : {
                scalePicked: 1,
                viewPicked : 'slide'
            }


        },
        computed: {
            currentScale : function () {
                var p = parseInt(this.appControl.scalePicked);
                var sx = 1.6;
                var sy = 2.2;
                if (p === 1) {
                    sx *= 1;
                    sy *= 1;
                } else if (p === 2) {
                    sx *= 3;
                    sy *= 3;
                } else if (p === 3) {
                    sx *= 5;
                    sy *= 5;
                }
                var c = {x: sx, y: sy}
                return c;
            },
            timeString   : function () {
                var d = new Date();
                var h = d.getHours() + '';
                var m = d.getMinutes() + '';
                if (h.length === 1) h = '0' + h;
                if (m.length === 1) m = '0' + m;
                return h + ':' + m;
            },
            cursorOnEvent: function () {
                var flag = false;
                if (parseInt(this.cursorLevel) === 3) {
                    this.currentFolder = getFolderByPos(this.cursorPosArray);
                    if (this.currentFolder.name !== 'None') {
                        setCursorColor(cursorEventColor);


                        flag = true;
                    }
                    else {
                        flag = false;
                    }

                }
                else {
                    flag = false;
                }
                if (!flag) {

                    setCursorColor(cursorDefaultColor);
                }

                return flag;
            }

        },
        watch   : {
            cursorLevel: function (val) {
                var brScale = anime();
                var ovScale = anime();

                var transX=this.currentFolder.translatePos[0];
                var transY=this.currentFolder.translatePos[1];
                if (val === 0) {

                    showView('#lock-screen');
                }
                if (val === 3) {


                    ovScale = anime({
                        targets : '#overview-level',
                        scale   : 1,
                        duration: 800
                    });

                    brScale = anime({
                        targets   : '#browsing-level',
                        translateX: transX,
                        translateY: transY,
                        scale     : 0.32,
                        opacity   : {
                            value   : 0,
                            duration: 200,
                            delay   : 200,
                            easing  : 'easeInOutSine'
                        }
                    });
                    showView('#overview-level');
                }
                if (val === 1) {
                    brScale = anime({
                        targets   : '#browsing-level',
                        translateX: 0,
                        translateY: 0,
                        scale     : 1.1,
                        opacity   : {
                            value   : 0,
                            duration: 200,
                            delay   : 100,
                            easing  : 'easeInOutSine'
                        }
                    });

                    showSlideBtns(80);

                    showView('#action-level');
                }
                if (val === 2) {
                    $('#browsing-level').css({
                        transform: 'translate('+transX+'px,'+transY+'px)'
                    })
                    ovScale = anime({
                        targets : '#overview-level',
                        scale   : 1.4,
                        duration: 800
                    });
                    brScale = anime({
                        targets: '#browsing-level',
                        opacity: 1
                    });
                    brScale = anime({
                        targets   : '#browsing-level',
                        translateX: 0,
                        translateY: 0,
                        scale     : 1,
                        delay     : 200
                    });
                    showSlideBtns(0);

                    hideViews();

                }
            }
        }

    });

    var socket = io();
    socket.on('drawing', onDrawingEvent);


    var controllerOptions = {enableGestures: true};
    var frameString = '';
    var pointableString = 'Pointable';
    if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
        app.platform = 'Iphone'
    } else {
        app.platform = 'Laptop'
        var controller = new Leap.Controller();
        controller.connect();
        controller.on('connect', function () {
            app.leapStatus = true;
        });
        controller.on('disconnect', function () {
            app.leapStatus = false;
        });


        Leap.loop(controllerOptions, function (frame) {

            var string = 'none';
            var last = app.appInfo.currentGesture;

            frameString = "Frame ID: " + frame.id + "<br />"
                + "Timestamp: " + frame.timestamp + " &micro;s<br />"
                + "Hands: " + frame.hands.length + "<br />"
                + "Fingers: " + frame.fingers.length + "<br />";
            app.frameData = frameString;

            pointableString = "";
            if (frame.pointables.length > 0) {
                for (var i = 0; i < frame.pointables.length; i++) {
                    var pointable = frame.pointables[i];


                    pointableString += "Pointable ID: " + pointable.id + "<br />";
                    pointableString += "Belongs to hand with ID: " + pointable.handId + "<br />";
                    pointableString += "Length: " + pointable.length.toFixed(1) + " mm<br />";
                    pointableString += "Width: " + pointable.width.toFixed(1) + " mm<br />";
                    pointableString += "Direction: " + vectorToString(pointable.direction, 2) + "<br />";
                    pointableString += "Tip position: " + vectorToString(pointable.tipPosition) + " mm<br />";
                    pointableString += "Tip velocity: " + vectorToString(pointable.tipVelocity) + " mm/s<br />";

                    if (i === 1) {
                        var positions = vectorToString(pointable.tipPosition).split(',');
                        var posX = positions[0];
                        var posY = positions[1];
                        var posZ = positions[2];

                        app.cursorPosString = posX + ',' + posY + ',' + posZ;
                        var watchCursor = getWatchPosByLeap(posX, posZ, posY);
                        drawCursor('#watchCursor', watchCursor, true);
                        app.cursorLevel = watchCursor.lvl;

                        app.cursorPosArray = [parseInt(watchCursor.x), parseInt(watchCursor.y)];
                        var infoCursor = getGraphPosByCursorLevel(app.cursorLevel);
                        drawInfoCursor('#infoCursor', infoCursor);
                        app.cursorName = getLevelName(watchCursor.lvl);
                    }
                }
            }
            app.pointableString = pointableString;


        })

    }


    function getFolderByPos(a) {
        var rad = 40;
        var posDaily = [92, 197];
        var posMedia = [159, 76];
        var posSocial = [217, 197];
        var name;
        var tPos=[];
        if (inCircleArea(a, posDaily, rad)) {
            slideTo(0);
            name= 'Daily';
            tPos=[-64,42];
        }
        else if (inCircleArea(a, posMedia, rad)) {
            slideTo(1);
            name= 'Media';
            tPos=[0,-78];
        }
        else if (inCircleArea(a, posSocial, rad)) {
            slideTo(2);
            name= 'Social';
            tPos=[63,42];
        }
        else {
            slideTo(3);
            name= 'None';
            tPos=[0,0];
        }
        return {
            name:name,
            translatePos: tPos
        }

    }

    function inCircleArea(point, circle, r) {
        var x1 = point[0];
        var y1 = point[1];
        var x2 = circle[0];
        var y2 = circle[1];

        //console.log(Math.sqrt(((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2))));
        return ((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)) < r * r;


    }

    function showView(id) {

        var otherLayers = $('.layer:not(' + id + ')')
        otherLayers.css({
            opacity: 0

        });

        setTimeout(function () {
            otherLayers.css({
                zIndex: 0
            })

        }, 0)
        $(id).css({
            zIndex : 1,
            opacity: 1
        })


    }

    function hideViews() {
        $('.layer').css({
            opacity: 0

        });
    }


    function drawCursor(id, c, emit) {
        var cursor = $(id);
        var xpos = parseInt(c.x);
        var ypos = parseInt(c.y);

        setTimeout(function () {
                cursor.css({
                    left: xpos + 'px',
                    top : ypos + 'px'
                });

                if (c.out) {
                    app.trackingStatus=false;
                    setContainerColor('#d2737ca3');
                }
                else {
                    app.trackingStatus=true;
                    setContainerColor('#1f242959');
                }

                if (!emit) {
                    return;
                }
                socket.emit('drawing', c);
            }
            , 0);
    }

    function drawInfoCursor(id, c) {
        var cursor = $(id);
        var xpos = parseInt(c.x);
        var ypos = parseInt(c.y);
        anime({
            targets   : id,
            left: xpos + 'px',
            top : ypos + 'px'
        });
        cursor.find('.cursorPoint').css({
            background: c.color
        });
    }


    function onDrawingEvent(data) {
        app.socketStatus = true;
        drawCursor('#watchCursor', data);

    }

    var swiper = new Swiper('.swiper-container', {
        pagination         : '.swiper-pagination',
        paginationClickable: true,
        nextButton         : '.swiper-button-next',
        prevButton         : '.swiper-button-prev',
        slidesPerView      : 1,
        spaceBetween       : 30
    });

    $('#btn1').click(function () {
        slideTo(2)
    });

});

function slideTo(n) {
    var mySwiper = document.querySelector('.swiper-container').swiper
    var a = mySwiper.slideTo(n,false);
    return a;
}


function setContainerColor(color) {
    $('.watch-container').css({
        boxShadow: '5px 5px 40px ' + color
    })
}

function setCursorColor(color) {
    $('#watchCursor').find('.cursorPoint').css({
        background: color
    });
}


function getWatchPosByLeap(x, y, z) {
    var r = 325 / 2;
    var x1 = r + x * app.currentScale.x;
    var y1 = r + y * app.currentScale.y;

    // level height
    var zBottomPos = 30;
    var z1Pos = 100;
    var z2Pos = 170;
    var zTopPos = 280;


    var c = cursorDefaultColor;
    var o = false;
    var l = 0;

    if (Math.abs(x1 - r) < 20 && Math.abs(y1 - r) < 20) {
        //c='#90bff8'
    }
    if (Math.abs(x1 - r) > r || Math.abs(y1 - r) > r || z > zTopPos || z < zBottomPos) {
        o = true;
    }

    if (z > zBottomPos && z < z1Pos) {
        l = 1;
    } else if (z > z1Pos && z < z2Pos) {
        l = 2;
    } else if (z > z2Pos && z < zTopPos) {
        l = 3;
    } else {
        l = 0;
    }


    var pos = {x: x1, y: y1, color: c, out: o, lvl: l};
    return pos;
}

function getGraphPosByCursorLevel(lvl) {
    var pos = {x: 0, y: 0, color: ''};
    pos.x = 200;
    if (lvl == 1) {
        pos.color = '#2566ab';
        pos.y = 190;
    }
    else if (lvl == 2) {
        pos.color = '#68a1dd'
        pos.y = 130;
    }
    else if (lvl == 3) {
        pos.color = '#a9dbff'
        pos.y = 50;

    }
    else {
        pos.color = '#ff8181'
        pos.y = 0;

    }
    return pos;
}

function getLevelName(lvl) {
    var name = '';
    if (lvl == 0) {
        name = 'Out of range';
    }
    else if (lvl == 3) {
        name = 'Overview';
    }
    else if (lvl == 2) {
        name = 'Browsing';

    }
    else {
        name = 'Action'
    }
    return name;
}


function showSlideBtns(v) {

    var o = map_range(v, 0, 40, 0, 1);
    var sc = map_range(v, 0, 40, 1, 0.6);

    var dur = 1000;

    var animelist = [];

    animelist.push(anime({
        targets   : ".left-btn",
        translateX: v + 'px',
        opacity   : o,
        duration  : dur
    }));

    animelist.push(anime({
        targets   : ".right-btn",
        translateX: -v + 'px',

        opacity : o,
        duration: dur
    }));

    animelist.push(anime({
        targets   : ".top-btn",
        translateY: v + 'px',

        opacity : o,
        duration: dur
    }));

    animelist.push(anime({
        targets   : ".bottom-btn",
        translateY: -v + 'px',

        opacity : o,
        duration: dur
    }));
    animelist.push(anime({
        targets : ".swiper-container",
        scale   : 1,
        duration: dur
    }));

    return animelist;
}


function vectorToString(vector, digits) {
    if (typeof digits === "undefined") {
        digits = 1;
    }
    return vector[0].toFixed(digits) + ", "
        + vector[1].toFixed(digits) + ", "
        + vector[2].toFixed(digits);
}


function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}