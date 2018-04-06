'use strict';

var app;

var cursorDefaultColor = '#40d58e';
var cursorEventColor = '#9bffec';


$(function () {


    app = new Vue({
        el      : '#app',
        data    : {
            platform        : '0',
            baseScale       : [1.8, 2.2],
            leapStatus      : false,
            socketStatus    : false,
            message         : 'Hello Vue!',
            leapPosArray    : [],
            leapFrameID     : 0,
            frameData       : '0',
            pointableString : '0',
            trackingStatus  : false,
            cursorPosString : '0',
            cursorPosArray  : [],
            cursorHoverCount: 0,
            cursorHoverStartFrame: 0,
            cursorLevel     : 0, //3-overview. 2-browsing. 1-action. 0-out of range
            cursorLastLevel : {
                level: 0,
                count: 1,
                len  : 10,
                last : 0
            },
            cursorName      : '',
            currentFolder   : {
                name        : 'Daily',
                translatePos: [-64, 38]
            },
            currentButton   : {

                name   : 'None',
                trigger: false,
                last   : 'None'
            },
            currentIcon     : {
                name: 'None',
                num : 0
            },
            currentNum      : {
                num    : -1,
                name   : 'None',
                trigger: false,
                last   : -1
            },
            numpadLog       : [],
            numpadSession   : {
                session : 1,
                trial   : 1,
                len     : 4,
                finished: false
            },
            numpadInput     : '',
            numpadFour      : {},
            appInfo         : {
                currentGesturef: '',
                lastGesture    : '',
            },
            appControl      : {
                scalePicked : 1,
                viewPicked  : 'slide',
                numpadPicked: 1
            }


        },
        computed: {
            currentScale : function () {
                var p = parseInt(this.appControl.scalePicked);

                /*
                Coordinate Scale
                */
                var sx = this.baseScale[0];
                var sy = this.baseScale[1];

                if (p === 1) {
                    sx *= 0.5;
                    sy *= 0.5;
                } else if (p === 2) {
                    sx *= 1.8;
                    sy *= 1.8;
                } else if (p === 3) {
                    sx *= 2.8;
                    sy *= 2.8;
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
                var lvl = parseInt(this.cursorLevel);
                var pos = this.cursorPosArray;

                if (this.appControl.viewPicked === 'numpad') {
                    this.currentNum = getNumIconByPos(pos, parseInt(this.appControl.numpadPicked))
                    if (this.currentNum.trigger === true) {
                        this.numpadInput += this.currentNum.name;
                        if (this.numpadInput.length === 4) {

                            finishNumpadFour(this.numpadFour, this.numpadInput);
                            this.numpadInput = '';
                            this.numpadLog.push(this.numpadFour);
                            if (this.numpadSession.trial === this.numpadSession.len) {
                                console.log('session finished');
                                this.numpadSession.finished = true;
                                this.numpadSession.trial = 0;
                            }
                            else {
                                this.numpadSession.finished = false;

                                setTimeout(function () {
                                    initNumpadTrial();

                                }, 200);
                            }
                            this.numpadSession.trial++;



                            console.log(this.numpadLog)

                        }
                    }


                }
                else {

                    if (lvl === 3) {
                        var delay = 0;
                        if (parseInt(this.cursorLastLevel) === 2) {
                            console.log(this.cursorLastLevel)
                            delay = 0;
                        }

                        this.currentFolder = getFolderByPos(pos);
                        if (this.currentFolder.name !== 'None') {
                            setCursorColor(cursorEventColor);
                            flag = true;
                        }

                    }
                    else if (lvl === 2) {
                        this.cursorHoverCount = 0;
                        this.currentIcon = getIconByPos(pos);
                        if (this.currentIcon.name !== 'None') {
                            setCursorColor(cursorEventColor);
                            flag = true;
                        }
                    }
                    else if (lvl === 1) {

                        if (this.currentFolder.name === 'None') {
                            return;
                        }


                        this.currentButton = getButtonByPos(pos);
                        if (this.currentButton.trigger === true) {
                            var id = '.screen-btn.' + this.currentButton.name + '-btn'

                            //alert(id);

                            buttonAnime(id);
                            if (this.currentButton.name === 'middle') {
                                showAppPopup();
                            }

                        }

                    }

                }
                if (!flag) {

                    setCursorColor(cursorDefaultColor);
                }

                return flag;
            }

        },
        watch   : {
            leapPosArray: function (val) {

                var posX = val[0];
                var posY = val[1];
                var posZ = val[2];
                this.cursorPosString = posX + ',' + posY + ',' + posZ;
                var watchCursor = getWatchPosByLeap(posX, posZ, posY);
                drawCursor('#watchCursor', watchCursor);
                var lvl = watchCursor.lvl;
                var last = this.cursorLastLevel;


                //待lvl数据稳定
                if (lvl === last.level) {
                    last.count++;
                }
                else {
                    last.count = 0;
                }
                if (last.count === last.len) {
                    last.last = this.cursorLevel;
                    this.cursorLevel = watchCursor.lvl;
                }

                last.level = watchCursor.lvl;

                this.cursorPosArray = [parseInt(watchCursor.x), parseInt(watchCursor.y)];
                var infoCursor = getGraphPosByCursorLevel(this.cursorLevel);
                drawInfoCursor('#infoCursor', infoCursor);
                this.cursorName = getLevelName(this.cursorLevel);


            },
            cursorLevel : function (val) {
                var brScale = anime();
                var ovScale = anime();

                var transX = this.currentFolder.translatePos[0];
                var transY = this.currentFolder.translatePos[1];


                if (val === 0) {

                    showView('#lock-screen');
                }

                if (val === 3) {
                    this.baseScale = [1.4, 1.8];


                    ovScale = anime({
                        targets : '#overview-level',
                        opacity : 1,
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
                            delay   : 0,
                            easing  : 'easeInOutSine'
                        }
                    });

                    showView('#overview-level');
                }

                if (val === 2) {

                    this.baseScale = [1.8, 2.2];
                    this.currentButton.last = 'None';

                    if (this.cursorLastLevel.last === 1) {
                        transX = transY = 1;
                    }
                    var o = 0.7;
                    if (this.currentFolder.name !== 'None') {
                        o = 1;
                        hideViews();

                    }
                    brScale = anime({
                        targets   : '#browsing-level',
                        translateX: [transX, 0],
                        translateY: [transY, 0],
                        scale     : 1,
                        opacity   : o,

                    });

                    showSlideBtns(0);
                    hideLoadingCursor();


                }

                if (val === 1) {
                    if (this.currentFolder.name === 'None') {
                        return;
                    }
                    this.baseScale = [3.2, 3.6];

                    brScale = anime({
                        targets   : '#browsing-level',
                        translateX: 0,
                        translateY: 0,
                        scale     : 1.1,
                        opacity   : {
                            value   : 0,
                            duration: 200,
                            delay   : 0,
                            easing  : 'easeInOutSine'
                        }
                    });

                    showSlideBtns(80);

                    showView('#action-level');
                }
            }

        }

    });

    var socket = io();
    //socket.on('drawing', onDrawingEvent);
    socket.on('data', onDataEvent);
    socket.on('option', updateOption);
    socket.on('numpad', updateNumpad);


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
                        var leapPosArray = vectorToString(pointable.tipPosition).split(',');

                        var leapFrameID = frame.id;
                        transmitData({
                            pos: leapPosArray,
                            id : leapFrameID
                        }, true);
                    }
                }
            }
            app.pointableString = pointableString;


        })

    }

    $('.app-control').bind('click', function (e) {
        var control;
        setTimeout(function () {
                control = {
                    scalePicked : app.appControl.scalePicked,
                    viewPicked  : app.appControl.viewPicked,
                    numpadPicked: app.appControl.numpadPicked
                }


                updateOption(control, true);

            }, 500
        );


    })

    $('#btn1').click(function () {
        slideTo(0)
    });
    $('#start-session-btn').click(function () {
        initNumpadTrial();

    })
    $('#download-csv-btn').click(function () {
        exportNumpadLog(app.numpadLog);
    });


    function updateNumpad(data, emit) {

        console.log(data);
        app.numpadFour = data.four;
        app.numpadSession = data.session;
        app.numpadInput = data.input;

        if (!emit) {
            return;
        }
        socket.emit('numpad', data);
    }

    function updateOption(data, emit) {

        console.log(data);
        app.appControl = data;

        if (!emit) {
            return;
        }
        socket.emit('option', data);
    }


    function transmitData(data, emit) {

        //console.log(data);
        app.leapPosArray = data.pos;
        app.leapFrameID = data.id;

        if (!emit) {
            return;
        }


        socket.emit('data', data);
    }

    function onDataEvent(data) {
        app.socketStatus = true;

        transmitData(data);
    }
    function initNumpadTrial() {
        app.numpadSession.finished = false;

        var four = getRandomNumber(parseInt(app.appControl.numpadPicked));
        var numpadFour = initNumpadFour(four, app.appControl.numpadPicked, app.numpadSession.trial);
        var data ={
            four: numpadFour,
            session:app.numpadSession,
            input: ''
        }

        setTimeout(function () {
            updateNumpad(data, true);
        }, 0);

    }


    var swiper = new Swiper('.swiper-container', {
        pagination         : '.swiper-pagination',
        paginationClickable: true,
        nextButton         : '.swiper-button-next',
        prevButton         : '.swiper-button-prev',
        slidesPerView      : 1,
        spaceBetween       : 30
    });
    swiper.slideTo(3);


});



function exportNumpadLog(data) {

    var JSonToCSV = {
        /*
         * obj是一个对象，其中包含有：
         * ## data 是导出的具体数据
         * ## fileName 是导出时保存的文件名称 是string格式
         * ## showLabel 表示是否显示表头 默认显示 是布尔格式
         * ## columns 是表头对象，且title和key必须一一对应，包含有
              title:[], // 表头展示的文字
              key:[], // 获取数据的Key
              formatter: function() // 自定义设置当前数据的 传入(key, value)
         */
        setDataConver : function (obj) {
            var bw = this.browser();
            if (bw['ie'] < 9) return; // IE9以下的
            var data = obj['data'],
                ShowLabel = typeof obj['showLabel'] === 'undefined' ? true : obj['showLabel'],
                fileName = (obj['fileName'] || 'UserExport') + '.csv',
                columns = obj['columns'] || {
                    title    : [],
                    key      : [],
                    formatter: undefined
                };
            var ShowLabel = typeof ShowLabel === 'undefined' ? true : ShowLabel;
            var row = "", CSV = '', key;
            // 如果要现实表头文字
            if (ShowLabel) {
                // 如果有传入自定义的表头文字
                if (columns.title.length) {
                    columns.title.map(function (n) {
                        row += n + ',';
                    });
                } else {
                    // 如果没有，就直接取数据第一条的对象的属性
                    for (key in data[0]) row += key + ',';
                }
                row = row.slice(0, -1); // 删除最后一个,号，即a,b, => a,b
                CSV += row + '\r\n'; // 添加换行符号
            }
            // 具体的数据处理
            data.map(function (n) {
                row = '';
                // 如果存在自定义key值
                if (columns.key.length) {
                    columns.key.map(function (m) {
                        row += '"' + (typeof columns.formatter === 'function' ? columns.formatter(m, n[m]) || n[m] : n[m]) + '",';
                    });
                } else {
                    for (key in n) {
                        row += '"' + (typeof columns.formatter === 'function' ? columns.formatter(key, n[key]) || n[key] : n[key]) + '",';
                    }
                }
                row.slice(0, row.length - 1); // 删除最后一个,
                CSV += row + '\r\n'; // 添加换行符号
            });
            if (!CSV) return;
            this.SaveAs(fileName, CSV);
        },
        SaveAs        : function (fileName, csvData) {
            var bw = this.browser();
            if (!bw['edge'] || !bw['ie']) {
                var alink = document.createElement("a");
                alink.id = "linkDwnldLink";
                alink.href = this.getDownloadUrl(csvData);
                document.body.appendChild(alink);
                var linkDom = document.getElementById('linkDwnldLink');
                linkDom.setAttribute('download', fileName);
                linkDom.click();
                document.body.removeChild(linkDom);
            }
            else if (bw['ie'] >= 10 || bw['edge'] == 'edge') {
                var _utf = "\uFEFF";
                var _csvData = new Blob([_utf + csvData], {
                    type: 'text/csv'
                });
                navigator.msSaveBlob(_csvData, fileName);
            }
            else {
                var oWin = window.top.open("about:blank", "_blank");
                oWin.document.write('sep=,\r\n' + csvData);
                oWin.document.close();
                oWin.document.execCommand('SaveAs', true, fileName);
                oWin.close();
            }
        },
        getDownloadUrl: function (csvData) {
            var _utf = "\uFEFF"; // 为了使Excel以utf-8的编码模式，同时也是解决中文乱码的问题
            if (window.Blob && window.URL && window.URL.createObjectURL) {
                var csvData = new Blob([_utf + csvData], {
                    type: 'text/csv'
                });
                return URL.createObjectURL(csvData);
            }
            // return 'data:attachment/csv;charset=utf-8,' + _utf + encodeURIComponent(csvData);
        },
        browser       : function () {
            var Sys = {};
            var ua = navigator.userAgent.toLowerCase();
            var s;
            (s = ua.indexOf('edge') !== -1 ? Sys.edge = 'edge' : ua.match(/rv:([\d.]+)\) like gecko/)) ? Sys.ie = s[1] :
                (s = ua.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] :
                    (s = ua.match(/firefox\/([\d.]+)/)) ? Sys.firefox = s[1] :
                        (s = ua.match(/chrome\/([\d.]+)/)) ? Sys.chrome = s[1] :
                            (s = ua.match(/opera.([\d.]+)/)) ? Sys.opera = s[1] :
                                (s = ua.match(/version\/([\d.]+).*safari/)) ? Sys.safari = s[1] : 0;
            return Sys;
        }
    };

    JSonToCSV.setDataConver({
        data    : data,
        fileName: 'log',
        columns : {
            title    : ['name', 'num','err', 'duration'],
            key      : ['name', 'four','err', 'duration'],
            formatter: function (n, v) {

                if (n === 'duration') return v + 's';
            }
        }
    });
    // name: 'session-'+session+'| trial-'+trial,
    //     four      : four,
    //     err       : 0,
    //     compeleted: 0,
    //     duration  : 0,
    //     start     : new Date().getTime()
    //
}

function initNumpadFour(four, session, trial) {
    session = 3 * (parseInt(app.appControl.scalePicked) - 1) + parseInt(session);
    var f = {
        name      : 'session-' + session + '| trial-' + trial,
        session   : session,
        trial     : trial,
        four      : four,
        err       : 0,
        compeleted: 0,
        duration  : 0,
        start     : new Date().getTime(),
    };


    return f;
}

function finishNumpadFour(f, input) {
    f.duration = (new Date().getTime() - f.start) / 1000;

    for (var i = 0; i < 4; i++) {
        if (f.four.charAt(i) !== input.charAt(i)) {
            f.err++;
        }
    }

    return f;
}

function drawCursor(id, c) {
    var cursor = $(id);
    var xpos = parseInt(c.x);
    var ypos = parseInt(c.y);

    cursor.css({
        left: xpos + 'px',
        top : ypos + 'px'
    });

    if (c.out) {
        app.trackingStatus = false;
        setContainerColor('rgba(255, 214, 107, 0.93)');
    }
    else {
        app.trackingStatus = true;
        setContainerColor('#1f242911');
    }

    // if (!emit) {
    //     return;
    // }
    //socket.emit('drawing', c);

}

function drawInfoCursor(id, c) {
    var cursor = $(id);
    var xpos = parseInt(c.x);
    var ypos = parseInt(c.y);
    anime({
        targets: id,
        //left: xpos + 'px',
        top    : ypos + 'px'
    });
    cursor.find('.cursorPoint').css({
        // background: c.color
    });
}

function slideTo(n) {
    var mySwiper = document.querySelector('.swiper-container').swiper
    var a = mySwiper.slideTo(n, false);
    return a;
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
    setTimeout(function () {
        $('.layer').css({
            opacity: 0

        });
    }, 500);
}

function setContainerColor(color) {
    $('#watch-overlay-shadow').css({
        boxShadow: '0px 0px 40px ' + color + ' inset'
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
    var zBottomPos = 10;
    var z1Pos = 80;
    var z2Pos = 160;
    var zTopPos = 300;


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

function getButtonByPos(a) {
    var len = 170;
    var count = app.cursorHoverCount;
    var rad = 90;
    var offset = 30;
    var screenW = 325;
    var cursorW = 32;
    var left = [-offset, screenW / 2];
    var right = [screenW + offset - cursorW, screenW / 2];
    var top = [screenW / 2, -offset];
    var bottom = [screenW / 2, screenW + offset - cursorW];
    var middle = [screenW / 2 - cursorW / 2, screenW / 2 - cursorW / 2];

    var name;
    var last = app.currentButton.last;
    var trigger = false;
    if (inCircleArea(a, left, rad)) {
        name = 'left';
    }
    else if (inCircleArea(a, top, rad)) {
        name = 'top';
    }
    else if (inCircleArea(a, right, rad)) {
        name = 'right';
    }
    else if (inCircleArea(a, bottom, rad)) {
        name = 'bottom';
    }
    else if (inCircleArea(a, middle, rad - 40)) {
        name = 'middle';
    }
    else {
        name = 'None';
    }


    if (name === 'None') {
        app.cursorHoverCount = 0;
        last = 'None';
    }
    else {
        if (count < len && last === 'None') {

            app.cursorHoverCount++;
        }
        else if (count === len) {
            app.cursorHoverCount = 0;
            trigger = true;
            last = name;
            cursorAnime();


        }
    }

    var loadingH = map_range(count, 0, len, 0, 100);
    $('.cursorLoadingPoint').css({
        height: loadingH + '%'
    });

    return {
        name   : name,
        trigger: trigger,
        last   : last
    }
}


function buttonAnime(id) {
    //var originColor=$(id).css('background');
    var originColor = '#667890';
    if (id.includes('middle')) {
        var color = anime({
            targets: id,

            translateX     : '+=0',
            translateY     : '+=0',
            scale          : [
                {value: '+=0.5'},
                {value: '-=0.5'}
            ],
            backgroundColor: [
                {value: '#40d58e'}, // Or #FFFFFF
                {value: '#63ffa6'}
            ],
            opacity        : [
                {value: '0.5'},
                {value: '0'}
            ],
            easing         : 'linear',
            direction      : 'alternate',
            duration       : 600
        });
    }
    else {
        var colors = anime({
            targets: id,

            translateX     : '+=0',
            translateY     : '+=0',
            scale          : [
                {value: '+=0.1'},
                {value: '-=0.1'}
            ],
            backgroundColor: [
                {value: '#40d58e'},
                {value: originColor}
            ],
            easing         : 'linear',
            direction      : 'alternate',
            duration       : 600
        });
    }

    hideLoadingCursor();

}

function cursorAnime() {
    var s = 1.3;
    var o = $('.cursorPoint').css('opacity');
    anime({
        targets   : '.cursorPoint',

        scale     : [s,1],
        opacity: [1,o],
        duration:1000,

    });
}

function hideLoadingCursor() {
    $('.cursorLoadingPoint').css({
        height: 0
    });
}

function getFolderByPos(a) {
    var rad = 50;
    var cursorR = 16;
    var posDaily = [92 - cursorR, 197 - cursorR];
    var posMedia = [159 - cursorR, 76 - cursorR];
    var posSocial = [217 - cursorR, 197 - cursorR];
    var name;
    var tPos = [];
    if (inCircleArea(a, posDaily, rad)) {
        slideTo(0);
        name = 'Daily';
        tPos = [-64, 42];
    }
    else if (inCircleArea(a, posMedia, rad)) {
        slideTo(1);
        name = 'Media';
        tPos = [0, -78];
    }
    else if (inCircleArea(a, posSocial, rad)) {
        slideTo(2);
        name = 'Social';
        tPos = [63, 42];
    }
    else {
        setTimeout(slideTo(3), 800);
        name = 'None';
        tPos = [0, 0];
    }
    return {
        name        : name,
        translatePos: tPos
    }

}

function getIconByPos(a) {
    var rad = 30;
    var pos1 = [134, 161];
    var pos2 = [63, 161];
    var pos3 = [95, 231];
    var pos4 = [173, 232];
    var pos5 = [211, 162];
    var pos6 = [239, 224];
    var name, num;
    if (app.currentFolder.name === 'Daily') {
        if (inCircleArea(a, pos1, rad)) {
            num = 1;
            name = 'Weather';
        }
        else if (inCircleArea(a, pos2, rad)) {
            num = 2;
            name = 'Stocks';
        }
        else if (inCircleArea(a, pos3, rad)) {
            num = 3;
            name = 'Activity';
        }
        else if (inCircleArea(a, pos4, rad)) {
            num = 4;
            name = 'To-do List';
        }
        else if (inCircleArea(a, pos5, rad)) {
            num = 5;
            name = 'Alarm';
        }
        else if (inCircleArea(a, pos6, rad)) {
            num = 6;
            name = 'Watch Pay';
        }
        else {
            num = 0;
            name = 'None';
        }
    }
    else {
        num = 0;
        name = 'None';
    }

    return {
        name: name,
        num : num
    }

}


function getNumIconByPos(a, numpad) {
    var rad = 40;
    var len = 45;

    var posArray;
    var posArray1 = [[160, 97], [95, 202], [225, 202]];
    var posArray2 = [[64, 106], [153, 106], [245, 106],
        [63, 199], [153, 199], [245, 199]];
    var posArray3 = [[88, 50], [153, 50], [221, 50],
        [88, 119], [153, 119], [221, 119],
        [88, 188], [153, 188], [221, 188],
        [88, 256], [153, 256], [221, 256]];


    var num;
    var trigger = false;
    var flag = false;
    if (numpad === 1) {
        posArray = posArray1;
        rad = 40;
    }
    else if (numpad === 2) {
        posArray = posArray2;
        rad = 30;
    }
    else if (numpad === 3) {
        posArray = posArray3;
        rad = 20;
    }

    for (var i = 0; i < posArray.length; i++) {
        if (inCircleArea(a, posArray[i], rad)) {
            num = i + 1;
            flag = true;
        }

    }
    if (!flag) {
        num = -1
    }

    var count = app.leapFrameID-app.cursorHoverStartFrame;
    var last = app.currentNum.last;

    if (num === -1) {
        app.cursorHoverStartFrame=app.leapFrameID;
        count=0;
        last = -1;
    }
    else {
        if (last !== -1) {
            app.cursorHoverStartFrame=app.leapFrameID;
            // app.cursorHoverCount++;
        }
        if (count > len) {
            //app.cursorHoverCount = 0;
            app.cursorHoverStartFrame=app.leapFrameID;
            trigger = true;
            cursorAnime();
            last = num;


        }
    }

    var loadingH = map_range(count, 0, len, 0, 100);
    $('.cursorLoadingPoint').css({
        height: loadingH + '%'
    });

    var name = num + '';
    if (num === 10) {
        name = '#'
    }
    if (num === 11) {
        name = '0'
    }
    if (num === 12) {
        name = '*'
    }
    if (num === -1) {
        name = 'None'
    }

    return {
        num    : num,
        name   : name,
        trigger: trigger,
        last   : last
    }

}


function getRandomNumber(n) {

    var max = 0;
    if (n === 1) {
        max = 3;
    }
    else if (n === 2) {
        max = 6;
    }
    else if (n === 3) {
        max = 9;
    }
    var tag = [];
    for (var i = 0; i < max; i++) {
        tag.push(0);
    }

    var four = "";
    var temp = 0;
    while (four.length !== 4) {
        temp = getRandomInt(max);//随机获取0~9的数字
        //if(tag[temp]===0){
        four += temp + 1;
        //  tag[temp]=1;
        //}
    }

    console.log(four);
    return four;

}


function showAppPopup() {
    $('#popup-screen').css({
        zIndex : '999',
        display: 'block'
    });
    anime({
        targets: '#popup-screen',
        opacity: 1,
        scale  : 1,
        easing : 'easeInOutQuad'
    });
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

function inCircleArea(point, circle, r) {
    var x1 = point[0];
    var y1 = point[1];
    var x2 = circle[0];
    var y2 = circle[1];

    //console.log(Math.sqrt(((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2))));
    return ((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)) < r * r;


}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function Stack() {
    var items = [];
    this.push = function (element) {
        items.push(element);
    };
    this.pop = function () {
        return items.pop();
    };
    this.peek = function () {
        return items[items.length - 1];
    };
    this.isEmpty = function () {
        return items.length == 0;
    };
    this.size = function () {
        return items.length;
    };
    this.clear = function () {
        items = [];
    };
    this.print = function () {
        console.log(items.toString());
    };
    this.toString = function () {
        return items.toString();
    };
}