/*
Name: Canvas Ricochet
Version: 1.0
Author: Ashton Blue
Author URL: http://blueashes.com
Publisher: Manning
*/

// Immediately executes the data inside and prevents global namespace issues
(function() {
    // How to figure out what a user's computer can handle for frames with fallbacks
    // Original by Paul Irish: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimFrame = (function() {
        return  window.requestAnimationFrame        ||
        window.webkitRequestAnimationFrame          ||
        window.mozRequestAnimationFrame             ||
        window.oRequestAnimationFrame               ||
        window.msRequestAnimationFrame              ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    })();

    // 一个用来容纳2D绘图环境的空变量。
    var ctx = null;

    var Game = {
        // Setup configuration
        canvas: document.getElementById('canvas'),
        setup: function() {
            if (this.canvas.getContext) {
                // Setup variables
                ctx = this.canvas.getContext('2d');

                // 从canvas元素中获取宽高值。
                this.width = this.canvas.width;
                this.height = this.canvas.height;

                // Run the game
                Screen.welcome();
                //添加新的事件侦听器
                this.canvas.addEventListener('click', this.runGame, false);
                Ctrl.init();
            }
        },

        // Setup initial objects
        init: function() { //包含了所有的对象实例。
            Background.init();
            Hud.init();
            Bricks.init();
            Ball.init();
            Paddle.init();
        },

        //animate函数经常在被调用时引用自身。
        animate: function() {
            //由于animate()是个在Game对象之外触发的自引用函数,所以必须引用Game对象,而非this
            Game.play = requestAnimFrame(Game.animate);
            Game.draw();
        },
        //draw()用于处理所有更新并绘制对象的逻辑。
        draw: function() {
            //将Canvas绘图板清空,每次更新它时,之前绘制的图形就会被清除。
            ctx.clearRect(0, 0, this.width, this.height);

            // Draw objects
            Background.draw();
            Bricks.draw();
            Paddle.draw();
            Hud.draw();
            Ball.draw();
        },

        // Must reference as Game isntead of this due to when the listener is fired (outside of the object)
        runGame: function() {
            //事件触发后就去除事件侦听器
            Game.canvas.removeEventListener('click', Game.runGame, false);
            Game.init();

            // Run animation
            Game.animate();
        },

        // Must reference as Game isntead of this due to when the listener is fired (outside of the object)
        restartGame: function() {
            Game.canvas.removeEventListener('click', Game.restartGame, false);
            Game.init();
        },

        // Leveling
        levelUp: function() { //每当关卡增加时,就会触发升级逻辑。
            Hud.lv += 1;
            Bricks.init();
            Ball.init();
            Paddle.init();
        },

        levelLimit: function(lv) { //将砖块限定为最高只能达到5行。
            return lv > 5 ? 5 : lv;
        }
    };
    //创建欢迎界面和事件侦听器
    var Screen = {
        welcome: function() {
            // Setup base values
            this.text = 'CANVAS RICOCHET';
            this.textSub = 'Click To Start';
            this.textColor = 'white';

            // Create screen
            this.create();
        },

        gameover: function() {
            this.text = 'Game Over';
            this.textSub = 'Click To Retry';
            this.textColor = 'red';

            this.create();
        },

        create: function() { //只输出设定的参数,以便于必要时调整界面文本。
            // Background
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, Game.width, Game.height); //背景

            // Main text
            ctx.fillStyle = this.textColor;
            ctx.textAlign = 'center';
            ctx.font = '40px helvetica, arial';
            ctx.fillText(this.text, Game.width / 2, Game.height / 2);

            // Sub text
            ctx.fillStyle = '#999999';
            ctx.font = '20px helvetica, arial';
            ctx.fillText(this.textSub, Game.width / 2, Game.height / 2 + 30);
        }
    };

    /***************************
    Game Objects
    ***************************/
    var Background = {
        init: function() {
            // Canvas需要一个Image对象来绘制背景。将源文件中的背景图片的文件名赋给Image.src
            this.ready = false;

            // Createa a background image
            this.img = new Image();
            this.img.src = 'background.jpg';
            this.img.onload = function() {
                Background.ready = true;
            };
        },
        draw: function() {
            if (this.ready) {
                ctx.drawImage(this.img, 0, 0);
            }
        }
    };
    //创建小球
    var Ball = {
        r: 10, //用于确定小球大小的半径变量r

        init: function() { //this.sx是x轴上的速度增量,this.sy是y轴上的速度增量。
            this.x = 120;
            this.y = 120;
            this.sx = 1 + (0.4 * Hud.lv); //小球的速度要和当前所处关卡匹配起来。
            this.sy = -1.5 - (0.4 * Hud.lv);
        },

        draw: function() {
            // Edge detection
            this.edges();
            this.collide();
            this.move();

            // Create ball
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            ctx.closePath();

            ctx.fillStyle = '#eee';
            ctx.fill();
        },

        move: function() {
            this.x += this.sx;
            this.y += this.sy;
        },

        // Edge dectection 小球碰撞检测
        edges: function() {
            // Top / bottom
            if (this.y < 1) { //游戏容器的上边界
                this.y = 1; // Prevents the ball from getting stuck at fast speeds
                this.sy = -this.sy;
            } else if (this.y > Game.height) { // 容器的下边界
                // Stop the ball and hide it
                //用一些方法和对象来隐藏小球并触发游戏结束状态。
                this.sy = this.sx = 0;
                this.y = this.x = 1000;

                // Shut down
                Screen.gameover();
                Game.canvas.addEventListener('click', Game.restartGame, false);
                return;
            }

            // Sides
            if (this.x < 1) { //容器的左边界
                this.x = 1; // Prevents the ball from getting stuck at fast speeds
                this.sx = -this.sx;
            } else if (this.x > Game.width) { // 容器的右边界
                this.x = Game.width - 1; // Prevents the ball from getting stuck at fast speeds
                this.sx = -this.sx;
            }
        },

        //  小球接触球拍
        collide: function() {
            if (this.x >= Paddle.x &&
                this.x <= (Paddle.x + Paddle.w) &&
                this.y >= Paddle.y &&
                this.y <= (Paddle.y + Paddle.h)) {
                //根据小球碰撞到球拍上的具体位置,修改小球在偏向弹回时的x坐标。
                this.sx = 7 * ((this.x - (Paddle.x + Paddle.w / 2)) / Paddle.w);
                this.sy = -this.sy;
            }
        }
    };

    //创建球拍
    var Paddle = {
        w: 90,
        h: 20,
        r: 9,
        init: function() {
            this.x = 100;
            this.y = 210;
            this.speed = 4; //用来控制球拍的速度
        },

        draw: function() {
            this.move();

            // Can be written much easier in newer browsers like this
            //ctx.beginPath();
            //ctx.moveTo(this.x, this.y);
            //ctx.arcTo(this.x + this.w, this.y, this.x + this.w, this.y + this.r, this.r);
            //ctx.arcTo(this.x + this.w, this.y + this.h, this.x + this.w - this.r, this.y + this.h, this.r);
            //ctx.arcTo(this.x, this.y + this.h, this.x, this.y + this.h - this.r, this.r);
            //ctx.arcTo(this.x, this.y, this.x + this.r, this.y, this.r);
            //ctx.closePath();
            //ctx.fillStyle = this.gradient();
            //ctx.fill();

            // Create paddle (only works in modern implementations of the Canvas W3C draft)
            ctx.beginPath();
            ctx.moveTo(this.x, this.y); //在绘制弧形之前,要先设置球拍的初始位置
            ctx.arcTo(this.x + this.w, this.y, this.x + this.w, this.y + this.r, this.r);
            ctx.lineTo(this.x + this.w, this.y + this.h - this.r);
            ctx.arcTo(this.x + this.w, this.y + this.h, this.x + this.w - this.r, this.y + this.h, this.r);
            ctx.lineTo(this.x + this.r, this.y + this.h);
            ctx.arcTo(this.x, this.y + this.h, this.x, this.y + this.h - this.r, this.r);
            ctx.lineTo(this.x, this.y + this.r);
            ctx.arcTo(this.x, this.y, this.x + this.r, this.y, this.r);
            ctx.closePath(); //关闭路径。这能防止出现一些图像撕裂和对象消失等错误。

            ctx.fillStyle = this.gradient();
            ctx.fill();
        },

        move: function() {
            // Detect controller input
            if (Ctrl.left && (this.x < Game.width - (this.w / 2))) {
                this.x += this.speed;
            } else if (Ctrl.right && this.x > -this.w / 2) {
                this.x += -this.speed;
            }
        },

        gradient: function() {
            if (this.gradientCache) {
                return this.gradientCache;
            }

            this.gradientCache = ctx.createLinearGradient(this.x, this.y, this.x, this.y + 20);
            this.gradientCache.addColorStop(0, '#eee');
            this.gradientCache.addColorStop(1, '#999');

            return this.gradientCache;
        }
    };
    //砖块类
    var Bricks = {
        gap: 2,
        col: 5,
        w: 80,
        h: 15,
        init: function() {
            this.row = 2 + Game.levelLimit(Hud.lv);//保证砖块不会因为行数过多而溢出游戏界面。
            this.total = 0;

            // Create an updatable brick array = number of bricks
            this.count = [this.row];
            // 砖块数组由砖块的行列号数据所构成。
            for (var i = this.row; i--;) {
                this.count[i] = [this.col];
            }
        },

        draw: function() {
            var i, j;
            for (i = this.row; i--;) {
                for (j = this.col; j--;) {
                    // 如果当前砖块不为false就绘制
                    if (this.count[i][j] !== false) {
                        // 碰撞侦测,判断小球是否与当前重绘的砖块发生重叠
                        if (Ball.x >= this.x(j) &&
                            Ball.x <= (this.x(j) + this.w) &&
                            Ball.y >= this.y(i) &&
                            Ball.y <= (this.y(i) + this.h)) {
                            this.collide(i, j);
                            continue;
                        }

                        ctx.fillStyle = this.gradient(i);//将自动根据砖块所属的行号,使同一列砖块的颜色形成漂亮的渐变。
                        ctx.fillRect(this.x(j), this.y(i), this.w, this.h);
                    }
                }
            }

            if (this.total === (this.row * this.col)) {
                Game.levelUp();
            }
        },

        x: function(row) {
            return (row * this.w) + (row * this.gap);
        },

        y: function(col) {
            return (col * this.h) + (col * this.gap);
        },
        //如果发生重叠,将其设定为false,并将小球的y坐标取负
        collide: function(i, j) {
            Hud.score += 1; //每当砖块被摧毁时,就递增得分计数器。
            this.total += 1; //递增砖块总数,以便让游戏知道何时结束__所有砖块都摧毁了。
            this.count[i][j] = false;
            Ball.sy = -Ball.sy;
        },
        //对砖块进行着色
        gradient: function(row) {
            switch(row) {
                case 0: // purple 如果存在缓存渐变,就使用它;如果不存在,就创建一个新的渐变。
                    return this.gradientPurple ?
                        this.gradientPurple :
                        this.gradientPurple = this.makeGradient(row, '#bd06f9', '#9604c7');
                case 1: // red
                    return this.gradientRed ?
                        this.gradientRed :
                        this.gradientRed = this.makeGradient(row, '#F9064A', '#c7043b');
                case 2: // green
                    return this.gradientGreen ?
                        this.gradientGreen :
                        this.gradientGreen = this.makeGradient(row, '#05fa15', '#04c711');
                default: // orange
                    return this.gradientOrange ?
                        this.gradientOrange :
                        this.gradientOrange = this.makeGradient(row, '#faa105', '#c77f04');
            }
        },

        makeGradient: function(row, color1, color2) {
            var y = this.y(row);
            //在特定位置创建一个新的线性渐变。
            var grad = ctx.createLinearGradient(0, y, 0, y + this.h);
            //渐变起始颜色为color1,终止颜色为color2
            grad.addColorStop(0, color1);
            grad.addColorStop(1, color2);

            return grad;
        }
    };
    //得分与关卡输出
    var Hud = {
        init: function() {
            this.lv = 1;
            this.score = 0;
        },

        draw: function() {
            ctx.font = '12px helvetica, arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.fillText('Score: ' + this.score, 5, Game.height - 5); //创建得分文本。
            ctx.textAlign = 'right';
            ctx.fillText('Lv: ' + this.lv, Game.width - 5, Game.height - 5); //创建关卡文本
        }
    };

    /***************************
    Game Controllers 实现键盘鼠标及触摸控制
    ***************************/
    var Ctrl = {
        init: function() {
            // Browser based events
            window.addEventListener('keydown', this.keyDown, true);
            window.addEventListener('keyup', this.keyUp, true);
            window.addEventListener('mousemove', this.movePaddle, true);

            // Events exclusive to touch devices
            Game.canvas.addEventListener('touchstart', this.movePaddle, false);
            Game.canvas.addEventListener('touchmove', this.movePaddle, false);

            // Disable scrolling on touch devices for the Canvas element, but still keep click event emulation
            Game.canvas.addEventListener('touchmove', this.stopTouchScroll, false);
        },

        keyDown: function(event) {
            switch(event.keyCode) {
                case 39: // Left
                    Ctrl.left = true;
                    break;
                case 37: // Right
                    Ctrl.right = true;
                    break;
                default:
                    break;
            }
        },

        keyUp: function(event) {
            switch(event.keyCode) {
                case 39: // Left
                    Ctrl.left = false;
                    break;
                case 37: // Right
                    Ctrl.right = false;
                    break;
                default:
                    break;
            }
        },

        // 屏蔽触摸移动的默认功能
        stopTouchScroll: function(event) {
            event.preventDefault();
        },

        movePaddle: function(event) {
            var mouseX = event.pageX;    //鼠标指针的x坐标

            //从浏览器窗口的左边界到Canvas元素的距离(以像素计)
            var canvasX = Game.canvas.offsetLeft;
            var paddleMid = Paddle.w / 2;

            if (mouseX > canvasX &&
                mouseX < canvasX + Game.width) {
                var newX = mouseX - canvasX;
                newX -= paddleMid; //偏移球拍的新位置,以便让球拍与鼠标指针对齐。
                Paddle.x = newX; //劫持已有的Paddle对象,更换新的x坐标值。
            }
        }
    };

    /***************************
    Run Game
    ***************************/
    window.onload = function() {
        Game.setup();
    };
}());