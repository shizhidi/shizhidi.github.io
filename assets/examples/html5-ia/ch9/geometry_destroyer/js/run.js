/*
Name: Run File
Version: 1.0
Author: Ashton Blue
Author URL: http://blueashes.com
Publisher: Manning

Desc: All templates, objects, and other code connected to running the game.
*/

(function() {

    // 初始化游戏设置

    // 从这里起,将所有代码都添加到一个自执行的函数中,以防止变量泄露到全局空间。
    gd.core.init(800, 600, function() { // 声明宽度与高度,以及引擎加载后所触发的游戏设置逻辑
        Ctrl.init();
        Hud.init();
        gd.game.spawn('Player');
    });

    // x and y coordinate information for 3D space, manually retrieved
    // 在 3D 可玩区域的宽度与高度。由于所有的衡量都是从位于中间位置的笛卡尔坐标系开始的,所以这里的宽高值都只是实际宽高值的一半。
    gd.game.size = {
        width: 43,
        height: 32
    };

    var Ctrl = { // 用户输入的控制器函数。
        init: function() {
            window.addEventListener('keydown', this.keyDown, true);
            window.addEventListener('keyup', this.keyUp, true);
        },

        keyDown: function(event) {
            switch(event.keyCode) {
                case 38: // up
                    Ctrl.up = true;
                    break;
                case 40: // down
                    Ctrl.down = true;
                    break;
                case 37: // Left
                    Ctrl.left = true;
                    break;
                case 39: // Right
                    Ctrl.right = true;
                    break;
                case 88:
                    Ctrl.x = true; // X键
                    break;
                default:
                    break;
            }
        },

        keyUp: function(event) {
            switch(event.keyCode) {
                case 38:
                    Ctrl.up = false;
                    break;
                case 40:
                    Ctrl.down = false;
                    break;
                case 37: // Left
                    Ctrl.left = false;
                    break;
                case 39: // Right
                    Ctrl.right = false;
                    break;
                case 88:
                    Ctrl.x = false;
                    break;
                default:
                    break;
            }
        }
    };

    // 创建玩家实体
    gd.template.Player = gd.template.Entity.extend({
        // Hit collision a = friendly, b = enemy
        type: 'a',

        // Spawning info
        x: -1.4, // 调整玩家实体的位置,使其能与文字完美对齐。


        // 所有的宽度与高度衡量单位都等于一个玩家单位。
        width: 1,
        height: 1,

        // 取值范围从0到360
        rotate: {
            angle: 0,
            axis: [0, 0, 1], // 只允许在2D空间内旋转玩家实体。
            speed: 3
        },

        // 用来确定玩家位置递增程度的变量
        speed: 0.5,

        // Says if the player is allowed to shoot or not
        shoot: true,

        // Time in milliseconds to delay firing
        shootDelay: 400,

        init: function() {
            // 设置三角形的形状
            this.shape([ // 创建一个三角形,绘制并连接传入的数组数据中所代表的3个不同的点。
                         // 数组中的每一行都代表着所绘制的点,3个数值分别是这一点的x、y、z坐标值。
                0.0,  2.0,  0.0, // top
               -1.0, -1.0,  0.0, // left
                1.0, -1.0,  0.0  // right
            ]);

            // Setup white color
            this.color([ // 对于用shape 方法绘制的每一个点赋予一种颜色,数值中每行都代表着一个颜色,4个数值分别是该颜色的R(red)、G(Green)、B(Blue)、A(Alpha)值。
                // red, green, blue, alpha (aka transparency)
                1.0, 1.0, 1.0, 1.0, // top // 将白色赋予刚才所创建的3个点。
                1.0, 1.0, 1.0, 1.0, // left
                1.0, 1.0, 1.0, 1.0  // right
            ]);
        },

        boundaryTop: function() { this.y = gd.game.size.height; },
        boundaryRight: function() { this.x = gd.game.size.width; },
        boundaryBottom: function() { this.y = -gd.game.size.height; },
        boundaryLeft: function () { this.x = -gd.game.size.width; },

        // 玩家实体的状态更新

        update: function() {// 每当绘制新的一帧时,就会触发update逻辑。
            var self = this;

            // 当按下左右方向键时,就会触发玩家实体的旋转功能。之前设置的cp.core.draw()方法会自动应用旋转。
            if (Ctrl.left) {
                this.rotate.angle += this.rotate.speed;
            } else if (Ctrl.right) {
                this.rotate.angle -= this.rotate.speed;
            }

            // 使用当前角度,自动更新玩家实体的位置
            if (Ctrl.up) {
                this.x -= Math.sin( this.rotate.angle * Math.PI / 180 ) * this.speed;
                this.y += Math.cos( this.rotate.angle * Math.PI / 180 ) * this.speed;
            } else if (Ctrl.down) {
                this.x += Math.sin( this.rotate.angle * Math.PI / 180 ) * this.speed;
                this.y -= Math.cos( this.rotate.angle * Math.PI / 180 ) * this.speed;
            }

            // 避免玩家实体越过游戏界面的边界。
            gd.game.boundaries(this, this.boundaryTop, this.boundaryRight, this.boundaryBottom, this.boundaryLeft);

            // Detect a player shooting
            if (Ctrl.x && this.shoot) {
                // 当玩家实体当前位置处生成一颗子弹，将其以当前角度发射出去。
                gd.game.spawn('Bullet', this.rotate.angle, this.x, this.y);

                // Create a timer to prevent firing
                this.shoot = false;
                window.setTimeout(function() {
                    self.shoot = true;
                }, this.shootDelay);
            }
        },

        kill: function() { // 当玩家实体被消灭, HUD 和多边形生成器就会停止运行。
            this._super();

            // Clear timeout for leveling
            PolygonGen.clear();

            // End game screen
            Hud.end();
        }
    });

    // 平视显示(HUD)
    var Hud = {
        init: function() { // 当玩家按下X键时,开始生成多边形。
            var self = this;

            // Setup start callback
            var callback = function() {
                if (Ctrl.x) {
                    // Remove listener
                    window.removeEventListener('keydown', callback, true);

                    // Create polygon generator
                    PolygonGen.init();

                    // Hide text
                    self.el.start.style.display = 'none';
                    self.el.title.style.display = 'none';
                }
            };

            // Add click start listener
            window.addEventListener('keydown', callback, true);
        },

        end: function() { // 结束游戏时,显示Game Over界面。
            var self = this;

            // Show end game text
            this.el.end.style.display = 'block';
        },

        score: { // 一个简单方法,用于递增并记录玩家的得分。
            count: 0,
            update: function() {
                this.count++;

                // Replace score text
                Hud.el.score.innerHTML = this.count;
            }
        },

        // Stores elements
        el: { // 获取并存储可改变的元素,以便于引用它们。
            score: document.getElementById('count'),
            start: document.getElementById('start'),
            end: document.getElementById('end'),
            title: document.getElementById('title')
        }
    };

    // 制作子弹
    gd.template.Bullet = gd.template.Entity.extend({
        type: 'a',
        width: 0.6,
        height: 0.6,
        speed: 0.8,
        angle: 0, // angle 用来确定子弹的运动方向(0 - 360度)

        // 注意,init()方法是如何在x,y坐标处产生子弹,并让子弹以玩家实体的当前角度发射出去。
        init: function(angle, x, y) {
            // Setup double sided triangle
            this.shape([
                // Front face
                0.0,  0.3,  0.0,
               -0.3, -0.3,  0.3,
                0.3, -0.3,  0.3
            ]);

            // 创建颜色矩阵的另一个方法。在创建大量颜色相同的点时,这一招很有用。
            var stack = [];
            for (var line = this.shapeRows; line--;)
                stack.push(1.0, 0.0, 0.0, 1.0);
            this.color(stack);

            // Set angle and location from parameters
            this.angle = angle;
            this.x = x;
            this.y = y;
        },

        update: function() {
            // Kill if the item goes outside a boundary
            gd.game.boundaries(this, this.kill, this.kill, this.kill, this.kill);

            // Movement
            this.x -= Math.sin( this.angle * Math.PI / 180 ) * this.speed;
            this.y += Math.cos( this.angle * Math.PI / 180 ) * this.speed;
        },

        collide: function() {
            this._super();
            Hud.score.update();
        }
    });

    //  //多边形生成器
    var PolygonGen = {
        delay: 7000,
        limit: 9,

        init: function() { //创建一个敌人生成的间隔时间,初始化多边形生成。
            var self = this;

            // Spawn first polygon
            this.count = 1;
            gd.game.spawn('Polygon');

            // Setup spawn timer
            this.create = window.setInterval(function() {

                // 避免因生成的敌人对象太多而使浏览器崩溃的失效保护方法
                if (gd.core.storage.b.length < self.limit) {
                    // Increase count
                    if (self.count < 3)
                        self.count++;

                    for (var c = self.count; c--;) {
                        gd.game.spawn('Polygon');
                    }
                }
            }, self.delay);
        },

        clear: function() { //停止生成多边形。
            // Clear timers
            window.clearInterval(this.create);

            // Set speed back to the default
            this.count = 0;
            this.delay = 7000;
        }
    };

    gd.template.Polygon = gd.template.Entity.extend({
        type: 'b',
        width: 7,  //从左到右,形状的顶点范围利用width来衡量,但height衡量的则是从上到下。
        height: 9,

        init: function() {
            this.shape([
                // Top triangle
                // Front face
                 0.0,  7.0,  0.0,
                -4.0,  2.0,  4.0,
                 4.0,  2.0,  4.0,
                // Right face
                 0.0,  7.0,  0.0,
                 4.0,  2.0,  4.0,
                 4.0,  2.0, -4.0,
                // Back face
                 0.0,  7.0,  0.0,
                 4.0,  2.0, -4.0,
                -4.0,  2.0, -4.0,
                // Left face
                 0.0,  7.0,  0.0,
                -4.0,  2.0, -4.0,
                -4.0,  2.0,  4.0,

                // Middle plates
                // Plate
                 -4.0, 2.0, 4.0,
                 -4.0, -5.0, 4.0,
                 -4.0, -5.0, -4.0,
                 -4.0, 2.0, 4.0,
                 -4.0, 2.0, -4.0,
                 -4.0, -5.0, -4.0,

                // Plate
                -4.0,  2.0, -4.0,
                -4.0, -5.0, -4.0,
                 4.0, -5.0, -4.0,
                -4.0,  2.0, -4.0,
                 4.0,  2.0, -4.0,
                 4.0, -5.0, -4.0,

                // Plate
                 4.0,  2.0,  4.0,
                 4.0,  2.0, -4.0,
                 4.0, -5.0, -4.0,
                 4.0,  2.0,  4.0,
                 4.0, -5.0,  4.0,
                 4.0, -5.0, -4.0,

                // Plate
                -4.0,  2.0,  4.0,
                 4.0,  2.0,  4.0,
                 4.0, -5.0,  4.0,
                -4.0,  2.0,  4.0,
                -4.0, -5.0,  4.0,
                 4.0, -5.0,  4.0,

                // Bottom triangle
                // Front face
                0.0, -10.0, 0.0,
                -4.0, -5.0,  4.0,
                 4.0, -5.0,  4.0,
                // Right face
                 0.0, -10.0, 0.0,
                 4.0, -5.0,  4.0,
                 4.0, -5.0, -4.0,
                // Back face
                 0.0, -10.0, 0.0,
                 4.0, -5.0, -4.0,
                -4.0, -5.0, -4.0,
                //Left face
                 0.0, -10.0, 0.0,
                -4.0, -5.0, -4.0,
                -4.0, -5.0,  4.0
            ]);

            this.randomSide();
            this.randomMeta();

            // Generate color vertices (relies on data set by this.randomMeta)
            // Triangle is 36 vertics
            // Square is 72
            var stack = [];

            // 由于要为大量的点指定颜色,所以不能手动添加,必须动态地创建颜色图。
            for (var v = 0; v < this.shapeRows * this.shapeColumns; v += 3) {
                // Triangle coloring
                if (v > 108 || v <= 36) { //测试是否绘制的是三角形
                    stack.push(this.colorData.pyramid[0], this.colorData.pyramid[1], this.colorData.pyramid[2], 1);

                // Square coloring
                } else {
                    stack.push(this.colorData.cube[0], this.colorData.cube[1], this.colorData.cube[2], 1);
                }
            }
            this.color(stack);
        },

        // Randomly genertes meta information such as speed, rotation, and other details at random
        // 负责创建关于旋转、速度及颜色的随机信息。
        randomMeta: function() {
            this.rotate = {
                speed: gd.game.random.number(400, 100),
                axis: [
                    gd.game.random.number(10, 1) / 10,
                    gd.game.random.number(10, 1) / 10,
                    gd.game.random.number(10, 1) / 10
                ],
                angle: gd.game.random.number(250, 1)
            };

            // Randomly generate speed
            this.speed = {
                x: gd.game.random.number(10, 4) / 100,
                y: gd.game.random.number(10, 4) / 100
            };

            // Choose 3 random colors and cache them
            // 负责为金字塔形状和立方体生成随机的颜色信息。利用刚才创建的 Ploygon,init()中的方法来处理并组织数据。
            this.colorData = {
                pyramid: [
                    gd.game.random.number(10, 1) / 10,
                    gd.game.random.number(10, 1) / 10,
                    gd.game.random.number(10, 1) / 10
                ],
                cube: [
                    gd.game.random.number(10, 1) / 10,
                    gd.game.random.number(10, 1) / 10,
                    gd.game.random.number(10, 1) / 10
                ]
            };
        },

        // 多边形的边,状态更新以及碰撞
        randomSide: function() {
            // Randomly spawn from one of four sides
            var side = gd.game.random.number(4, 1);

            //top
            if (side === 1) {
                this.angle = gd.game.random.number(200, 160);
                var range = gd.game.size.width - this.width;
                this.x = gd.game.random.number(range, -range);
                this.y = gd.game.size.height + this.height;

            // right
            } else if (side === 2) {
                this.angle = gd.game.random.number(290, 250);
                var range = gd.game.size.height - this.height;
                this.x = (gd.game.size.width + this.width) * -1;
                this.y = gd.game.random.number(range, -range);

            // bottom
            } else if (side === 3) {
                this.angle = gd.game.random.number(380, 340);
                var range = gd.game.size.width - this.width;
                this.x = gd.game.random.number(range, -range);
                this.y = (this.height + gd.game.size.height) * -1;

            // left
            } else {
                this.angle = gd.game.random.number(110, 70);
                var range = gd.game.size.height - this.height;
                this.x = gd.game.size.width + this.width;
                this.y = gd.game.random.number(range, -range);
            }
        },

        update: function() {
            gd.game.boundaries(this, this.kill, this.kill, this.kill, this.kill, (this.width * 2));

            // Logic for acceleration
            this.x -= Math.sin( this.angle * Math.PI / 180 ) * this.speed.x;
            this.y += Math.cos( this.angle * Math.PI / 180 ) * this.speed.y;

            gd.game.rotate(this); // 使用随机生成的旋转数据,让多边形慢慢旋转。
        },

        collide: function() {
            // Generate a number of particles spawned at current center
            // But only if the game has enough memory to support it
            // 当多边形被摧毁时,在多边形的中心创建一些粒子,只有当存储区不是太满时才这样做,以防止内存被消耗殆尽。
            if (gd.core.storage.all.length < 50) {
                for (var p = 15; p--;) {
                    gd.game.spawn('Particle', this.x, this.y);
                }
            }

            // Generate a random number of cubes spawned at current center
            var num = gd.game.random.number(2, 4);
            for (var c = num; c--;) {  //当多边形被摧毁时,在多边形的中心创建一系列立方体。
                gd.game.spawn('Cube', this.x, this.y);
            }

            this.kill();
        }
    });

    // 立方体形状
    gd.template.Cube = gd.template.Entity.extend({
        type: 'b',
        size: { //利用size对象和元数据方法来随机生成立方体尺寸。稍后将该实体为粒子扩展时,这能便于改变尺寸。
            max: 3,
            min: 2,
            divider: 1
        },
        pressure: 50, // pressure 用来控制多边形爆裂后迸溅出的立方体的速度。

        meta: function() {
            // Random x and y acceleration
            this.speed = {
                x: (gd.game.random.number(this.pressure, 1) / 100) * gd.game.random.polarity(),
                y: (gd.game.random.number(this.pressure, 1) / 100) * gd.game.random.polarity()
            };

            // Random direction
            this.angle = gd.game.random.number(360, 1);

            // Random size
            this.s = gd.game.random.number(this.size.max, this.size.min) / this.size.divider;
            this.width = this.s * 2;
            this.height = this.s * 2;
        },

        init: function(x, y) {
            //利用在生成敌人时传入的参数来设定x和y。
            this.x = x;
            this.y = y;

            this.meta();

            this.shape([ //前面板。this.s 引用了后面 gd.template.Cube.meta()生成的随机尺寸。
                // Front
                -this.s, -this.s,  this.s,
                 this.s, -this.s,  this.s,
                 this.s,  this.s,  this.s,
                -this.s,  this.s,  this.s,
                // Back
                -this.s, -this.s, -this.s,
                -this.s,  this.s, -this.s,
                 this.s,  this.s, -this.s,
                 this.s, -this.s, -this.s,
                // Top
                -this.s,  this.s, -this.s,
                -this.s,  this.s,  this.s,
                 this.s,  this.s,  this.s,
                 this.s,  this.s, -this.s,
                // Bottom
                -this.s, -this.s, -this.s,
                 this.s, -this.s, -this.s,
                 this.s, -this.s,  this.s,
                -this.s, -this.s,  this.s,
                // Right
                 this.s, -this.s, -this.s,
                 this.s,  this.s, -this.s,
                 this.s,  this.s,  this.s,
                 this.s, -this.s,  this.s,
                // Left
                -this.s, -this.s, -this.s,
                -this.s, -this.s,  this.s,
                -this.s,  this.s,  this.s,
                -this.s,  this.s, -this.s
            ]);

            this.indices([ //indices 的每一行都包含两个三角形的形状坐标,从而组成一个正方形的面板。这里的每个数值都代表indice上的一个索引,而不是x,y,z坐标值。
                 0,  1,  2,    0,  2,  3, // front
                 4,  5,  6,    4,  6,  7, // back
                 8,  9, 10,    8, 10, 11, // top
                12, 13, 14,   12, 14, 15, // bottom
                16, 17, 18,   16, 18, 19, // right
                20, 21, 22,   20, 22, 23  // left
            ]);

            this.color([ //传入一个表示颜色的indices 数组。之前,template.js中已经设定了颜色方法,为indices输出了大量的颜色数据。
                [1, 0, 0, 1], // Front: red
                [0, 1, 0, 1], // Back: green
                [0, 0, 1, 1], // Top: blue
                [1, 1, 0, 1], // Bottom: blue
                [1, 0, 1, 1], // Right face: yellow
                [0, 1, 1, 1]  // Left face: purple
            ]);

            if (this.rotate) {
                this.rotate = {
                    axis: [
                        gd.game.random.number(10, 1) / 10,
                        gd.game.random.number(10, 1) / 10,
                        gd.game.random.number(10, 1) / 10],
                    angle: gd.game.random.number(350, 1),
                    speed: gd.game.random.number(400, 200)
                };
            }
        },

        // Occurs at each frame update
        // Init: function() {} can also be called to alter an object right when its created
        update: function() {
            var self = this;
            gd.game.boundaries(self, this.kill, this.kill, this.kill, this.kill, this.width);

            // Logic for acceleration
            this.x -= Math.sin( this.angle * Math.PI / 180 ) * this.speed.x;
            this.y += Math.cos( this.angle * Math.PI / 180 ) * this.speed.y;

            // Uses a measurement of time to update and configure your rotation
            // Originally from Mozilla's WebGL tutorial https://developer.mozilla.org/en/WebGL/Animating_objects_with_WebGL
            if (this.rotate)
                gd.game.rotate(this);
        }
    });


    // 生成粒子
    gd.template.Particle = gd.template.Cube.extend({ //对立方体逻辑进行扩展,而不是重写一个全新的粒子实体。
        pressure: 20,
        type: 0,
        size: {
            min: 2,
            max: 6,
            divider: 10
        },

        init: function(x, y) {
            this.x = x;
            this.y = y;

            this.meta();

            // Setup flat rectangle shape
            this.shape([
                 this.s,  this.s,  0.0,
                -this.s,  this.s,  0.0,
                 this.s, -this.s,  0.0,
                -this.s, -this.s,  0.0
            ]);

            // 随机生成RGB颜色数值,同时还带有固定的透明度。
            var r = gd.game.random.number(10, 0) / 10,
            g = gd.game.random.number(10, 0) / 10,
            b = gd.game.random.number(10, 0) / 10;
            this.color([
                r, g, b, 1,
                r, g, b, 1,
                r, g, b, 1,
                r, g, b, 1
            ]);

            var self = this;
            this.create = window.setTimeout(function() { //生成5秒后, 即将粒子从内存中清除,以防止内存消耗殆尽。
                self.kill();
            }, 5000);
        }
    });
}());