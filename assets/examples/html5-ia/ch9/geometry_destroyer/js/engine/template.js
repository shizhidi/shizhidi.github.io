/*
Name: Entity Templates
Version: 1.0
Author: Ashton Blue
Author URL: http://blueashes.com
Publisher: Manning
Credits: Uses a modified version of John Resig's class extension script http://ejohn.org/blog/simple-javascript-inheritance/

Desc: Storage location for all classes.
*/

var gd = gd || {};

// Initialize and create an object so other classes can be stored here
gd.template = {
    Entity: Class.extend({

        // 缓冲区配置

        // Passive = 0, friendly a, enemy b
        type: 0,

        // 把碰撞侦测放在字符串中,a代表友方,b代表敌人,0代表被动。在碰撞侦测过程中,友方或敌人实体可能会发生碰撞,但被动实体则不会发生碰撞。
        // Determines position
        x: 0,
        y: 0,
        z: 0,  //z轴的存在,标明元素处于3D空间内。稍后我们再详细介绍这一点。

        // Creates an artifical zoom without a complex transformation matrix or camera
        zoom: -80, //使用焦距变化在WebGL应用中虚拟出一台摄像机。通常,实现这个功能需要编写很多代码,但在该例中,为了加速开发进程,
                   //我们将其设定为固定的值,算是一种取巧。

        // Returns x, y, z in an array
        position: function() {
            return [this.x, this.y, this.z + this.zoom]; //组装并返回一个用WebGL可编辑格式表示的位置坐标。
        },

        // Width and height relative to 3D world, manually set
        width: 0,
        height: 0,

        update: function() {
            // 在实体被绘制前,update()经常会被调用。
        },

        // 碰撞会触发kill方法。
        collide: function(object) {
            this.kill();
        },

        // 在cp.core.draw()再次运行之前,将实体送入实体墓地进行删除。
        kill: function() {
            gd.core.graveyard.storage.push(this);
        },

        // 旋转稍后会为每个实体设置一种各不相同的角度。
        rotate: {
            angle: 0,
            axis: false
        },

        shape: function(vertices) { //创建形状时,需要调入矩阵,这个方法能处理好其他一些工作。

            this.shapeStorage = gd.gl.createBuffer(); //创建缓冲区数据

            // 存储所创建的缓冲区数据,以备后续使用。
            gd.gl.bindBuffer(gd.gl.ARRAY_BUFFER, this.shapeStorage);

            // 利用 float32 将数组改变成WebGL可编辑格式。
            gd.gl.bufferData(gd.gl.ARRAY_BUFFER, new Float32Array(vertices), gd.gl.STATIC_DRAW);

            // 每个方法末尾都需要记录下传入的数组信息,因为附属的 sylvester.js 需要额外的数组细节。
            this.shapeColumns = 3;
            this.shapeRows = vertices.length / this.shapeColumns;
        },

        color: function(vertices) {
            this.colorStorage = gd.gl.createBuffer();

            // 用来将较大的颜色数据包进行反编译的辅助循环函数。
            if (typeof vertices[0] === 'object') {
                // temporary storage location for new vertices
                var colorNew = [];

                // Create complete verticy array
                for (var v = 0; v < vertices.length; v++) {
                    var colorLine = vertices[v];
                    for (var c = 0; c < 4; c++) {
                        colorNew = colorNew.concat(colorLine);
                    }
                }

                // Apply new verticy array
                vertices = colorNew;
            }

            // Bind buffers as buffer.shape
            gd.gl.bindBuffer(gd.gl.ARRAY_BUFFER, this.colorStorage);
            gd.gl.bufferData(gd.gl.ARRAY_BUFFER, new Float32Array(vertices), gd.gl.STATIC_DRAW);

            // Count rows
            this.colorColumns = 4;
            this.colorRows = vertices.length / this.colorColumns;
        },

        // indices 是 index的复数形式。WebGL利用缓冲区将三角面组合成一个形状。通过使用indices,可以定义一对三角面的位置,而不必每次只能定义一个。
        indices: function(vertices) {
            this.indicesStorage = gd.gl.createBuffer();
            gd.gl.bindBuffer(gd.gl.ELEMENT_ARRAY_BUFFER, this.indicesStorage);
            gd.gl.bufferData(gd.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertices), gd.gl.STATIC_DRAW);

            // Important, drawing with a indices buffer combines triangles, so you're drawing with half the normal amount
            this.indicesCount = vertices.length;
        }
    })
};