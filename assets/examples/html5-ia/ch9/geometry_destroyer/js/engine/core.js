/*
Name: Engine Core
Version: 1.0
Author: Ashton Blue
Author URL: http://blueashes.com
Publisher: Manning
Credits: Based on Mozilla's WebGL (https://developer.mozilla.org/en/WebGL)
and Giles Thomas' Learning WebGL (http://learningwebgl.com/blog) tutorials.

Desc: Contains all the components that handle setup and object generation.
Important, shouldn't contain any functions run during a game. Those should
be stored in game.js. All classes are stored in template.js.
*/

// 继承一个已有的gd变量或新创建一个 。非常适合通过多个文件访问gd。
var gd = gd || {};

gd.core = {
    canvas: document.getElementById("canvas"),

    // 游戏区域的宽度和高度
    size: function(width, height) {
        // 设置WebGL视窗比例,如果不这么做,画布的宽高比将会不正确。
        this.horizAspect = width / height;
    },

    // 为每一个新实体分配一个独立的ID识别器,以加速对象的搜索和删除任务。
    id: {
        count: 0,
        get: function() {
            return this.count++;
        }
    },

    // 保存所以生成对象的storage容器。a和b这两个容器用于碰撞侦测比对的删减过程中。友方对象放在a中,敌人放在b中。
    storage: {
        all: [],
        a: [],
        b: []
    },

    init: function(width, height, run) {
        this.size(width, height);

        if (!this.canvas.getContext) return alert('Please download a browser that supports Canvas like Google Chrome to proceed.');
        gd.gl = this.canvas.getContext("experimental-webgl");

        //手动检测WebGL支持。如果get-Context()不起作用,有些浏览器会返回null,有些则会返回undefined。
        if (gd.gl === null || gd.gl === undefined)
            return alert('Uhhh, your browser doesn\'t support WebGL. Your options are build a large wooden badger or download Google Chrome.');

        // 设置基本属性
        gd.gl.clearColor(0.05, 0.05, 0.05, 1.0); // 为WebGL设定一种近似纯黑的颜色
        gd.gl.enable(gd.gl.DEPTH_TEST);
        gd.gl.depthFunc(gd.gl.LEQUAL); // 这两行代码能够给人建立一种景深感。
        gd.gl.clear(gd.gl.COLOR_BUFFER_BIT | gd.gl.DEPTH_BUFFER_BIT); // Clear color and depth buffer

        // Setup WebGL
        this.shader.init();
        this.animate();

        // 当所有准备就绪后,触发run
        window.onload = run;
    },

    animate: function() {
        requestAnimFrame(gd.core.animate);
        gd.core.draw();
    },
    //设置着色器
    shader: {
        // Creates the shader base
        init: function() {
            //从DOM取出着色器程序。注意这的shader-fragment和shader-vertex引用的是我们之前编写的那两个着色器
            this.fragments = this.get('shader-fragment');
            this.vertex = this.get('shader-vertex');

            // 为着色器创建一个程序(保存一个片段着色器和定点着色器)
            this.program = gd.gl.createProgram();

            // 将着色器与创建的“程序”连接起来。
            gd.gl.attachShader(this.program, this.vertex);
            gd.gl.attachShader(this.program, this.fragments);
            // Attach the new program we created
            gd.gl.linkProgram(this.program);

            //着色器加载时发生崩溃的失效保护语句
            if (!gd.gl.getProgramParameter(this.program, gd.gl.LINK_STATUS)) {
                return alert("Shaders have FAILED to load.");
            }

            // Tell WebGL its okay to use the assembled program
            gd.gl.useProgram(this.program);

            // 保存着色器数据，以备后续使用
            this.store();

            // 从内存中清楚残留的无用着色器数据。可以手动地删除这些着色器,等待Javascript的垃圾回收器进行内存回收,但是我们这种办法能提供更多的控制
            gd.gl.deleteShader(this.fragments);
            gd.gl.deleteShader(this.vertex);
            gd.gl.deleteProgram(this.program);
        },

        // 提取着色器
        get: function(id) {
            this.script = document.getElementById(id);

            // 如果DOM中没有着色器脚本,则返回null,以及一个出粗信息。
            if (!this.script) {
                alert('The requested shader script was not found in the DOM. Make sure that shader.get(id) is properly setup.');
                return null;
            }

            this.source = "";
            this.currentChild = this.script.firstChild;

            // 通过一个while循环采集着色器数据,并返回一个编译好的着色器数据。
            while (this.currentChild) {
                if (this.currentChild.nodeType === this.currentChild.TEXT_NODE) {
                    this.source += this.currentChild.textContent; // Dump shader data here
                }
                this.currentChild = this.currentChild.nextSibling;
            }

            // 测试正在使用的着色器类型(片段着色器还是顶点着色器),根据结果进行相应处理。
            if (this.script.type === 'x-shader/x-fragment') {
                this.shader = gd.gl.createShader(gd.gl.FRAGMENT_SHADER);
            } else if (this.script.type === 'x-shader/x-vertex') {
                this.shader = gd.gl.createShader(gd.gl.VERTEX_SHADER);
            } else {
                return null; // Type of current shader is unknown
            }

            // 获取所有的着色器数据,把它们编译在一起。
            gd.gl.shaderSource(this.shader, this.source);
            gd.gl.compileShader(this.shader);

            // Compile success? If not fire an error.
            if (!gd.gl.getShaderParameter(this.shader, gd.gl.COMPILE_STATUS)) {
                //如果没有编译成功,则返回一个出错信息。
                alert('Shader compiling error: ' + gd.gl.getShaderInfoLog(this.shader));
                return null;
            }

            // Give back the shader so it can be used
            return this.shader;
        },

        // Stores shader data in other places for easy usage later
        store: function() {
            // 从着色器程序中提取顶点数据,以备后续渲染3D对象。
            this.vertexPositionAttribute = gd.gl.getAttribLocation(this.program, "aVertexPosition");
            gd.gl.enableVertexAttribArray(this.vertexPositionAttribute);

            // 从着色器程序中提取颜色数据
            this.vertexColorAttribute = gd.gl.getAttribLocation(this.program, "aVertexColor");
            gd.gl.enableVertexAttribArray(this.vertexColorAttribute);
        }
    },

    draw: function() {

        //绘制形状(一)

        //清除WebGL视口,以便绘制全新的帧。
        gd.gl.clear(gd.gl.COLOR_BUFFER_BIT | gd.gl.DEPTH_BUFFER_BIT);

        // 将观察视角从1单位距离设置为300单位距离(以防止宽高比失真)。
        this.perspectiveMatrix = makePerspective(45, this.horizAspect, 0.1, 300.0);

        // Loop through every object in storage.all
        for (var i in this.storage.all) {
            // 遍历存储区中的所有实体并将它们绘制出来。for循环语句并未结束,在下面两个代码清单中还会添加一些功能。
            // Resets and creates a matrix that has 1s diagnolly and 0s everywhere else, crazy math stuff
            // Essential in processing your matrices for object creation
            // If you are a math nut and really want to understand this read http://mathworld.wolfram.com/IdentityMatrix.html
            /* Basic idea/example of this matrix
            [ 1, 0, 0
              0, 1, 0
              0, 0, 1 ]
            */
            this.loadIdentity(); // 重置并创建矩阵,1占对角线,其他位置都为0

            // 在输出形状之前运行update(),以防止新实体瞬时的显示位置出错。
            this.storage.all[i].update(); //

            // Draw at location x, y, z
            // 从实体中提取出x,y,z坐标,明确所要绘制的位置,将其推送入一个数组。
            this.mvTranslate(this.storage.all[i].position());
            this.mvPushMatrix(); // 将当前矩阵项目推送入矩阵堆栈顶部的标准化方法。

            // Pass rotate data if present
            if (this.storage.all[i].rotate.axis) { // 如果存在旋转数据,则会在此运行。
                this.mvRotate(
                    this.storage.all[i].rotate.angle,
                    this.storage.all[i].rotate.axis);
            }


            //绘制形状(2)
            // 将 ARRAY_BUFFER 绑定到shapeStorage对象上。
            gd.gl.bindBuffer(
                gd.gl.ARRAY_BUFFER,
                this.storage.all[i].shapeStorage);
            gd.gl.vertexAttribPointer( // 定义一个包含通用的顶点数据的数组。
                this.shader.vertexPositionAttribute,
                this.storage.all[i].shapeColumns,
                gd.gl.FLOAT,
                false, 0, 0); // Pass position data

            // Pass color data
            gd.gl.bindBuffer(
                gd.gl.ARRAY_BUFFER,
                this.storage.all[i].colorStorage);
            gd.gl.vertexAttribPointer(
                this.shader.vertexColorAttribute,
                this.storage.all[i].colorColumns,
                gd.gl.FLOAT,
                false, 0, 0);

            this.setMatrixUniforms(); // 为了让着色器正确显现,将矩阵数据从 Javascript 推送到WebGL中。

            // Take the matrix vertex positions and go through all of the elements from 0 to the .numItems object
            if (this.storage.all[i].indicesStorage) { // 根据是否使用了indices, 对缓冲区数据进行不同的输出。
                // Creation of 3D shape
                gd.gl.drawElements(
                    gd.gl.TRIANGLES,
                    this.storage.all[i].indicesCount,
                    gd.gl.UNSIGNED_SHORT,
                    0);
            } else {
                // Creation of 2D shape
                gd.gl.drawArrays(
                    gd.gl.TRIANGLE_STRIP,
                    0,
                    this.storage.all[i].shapeRows);
            }

            // Restore original matrix to prevent objects from inheriting properties
            this.mvPopMatrix(); // 从当前的矩阵堆栈中去除一个项目

            // 绘制形状(三)

            // 二维元素的碰撞检测
            // 为了尽可能地简化逻辑,这里采用的碰撞侦测只针对 a、b两种类型的实体
            if (this.storage.all[i].type === 'a') {
                // Check all items in the b type array only since its an a type item
                for (var en = this.storage.b.length; en--;) {
                    // Test for overlap between the two
                    if (this.overlap(
                    this.storage.all[i].x,
                    this.storage.all[i].y,
                    this.storage.all[i].width,
                    this.storage.all[i].height,
                    this.storage.b[en].x,
                    this.storage.b[en].y,
                    this.storage.b[en].width,
                    this.storage.b[en].height)) {
                        // If they have collided, run the collision logic for both entities
                        this.storage.all[i].collide(this.storage.b[en]);
                        this.storage.b[en].collide(this.storage.all[i]);
                    }
                }
            }
        }

        // Clean out killed items
        this.graveyard.purge(); // 将被删除的元素从墓地中清楚。之所以把它放在循环的外部进行,是为了防止意外引用了并不存在的实体。
    },

    // Used to destroy entities when necessary instead of doing it during the loop and potentially blowing
    // everything up by accident.
    // 用于在更新循环末尾删除实体,以免意外引用了不存在的实体。
    graveyard: {
        storage: [],
        purge: function() {
            if (this.storage) {
                for (var obj = this.storage.length; obj--;) {
                    // Remove object from memory and delete
                    this.remove(this.storage[obj]);
                }
                this.graveyard = [];
            }
        },
        remove: function(object) {
            // Remove from main storage
            var obj;
            for (obj = gd.core.storage.all.length; obj--;) {
                if (gd.core.storage.all[obj].id === object.id) {
                    gd.core.storage.all.splice(obj, 1);
                    break;
                }
            }

            // Remove from specialized storage
            switch (object.type) {
                case 'a':
                    for (obj = gd.core.storage.a.length; obj--;) {
                        if (gd.core.storage.a[obj].id === object.id) {
                            gd.core.storage.a.splice(obj, 1);
                            break;
                        }
                    }
                    break;
                case 'b':
                    for (obj = gd.core.storage.b.length; obj--;) {
                        if (gd.core.storage.b[obj].id === object.id) {
                            gd.core.storage.b.splice(obj, 1);
                            break;
                        }
                    }
                    break;
                default:
                    break;
            }

            // Clean buffers out of browser's memory permanently
            // javaScript 的垃圾清理机制不是很好,所以你需要手动地从实体中清理3D数据,以免程序运行得越来越慢。
            gd.gl.deleteBuffer(object.colorStorage);
            gd.gl.deleteBuffer(object.shapeStorage);
        }
    },
    // 用于检测两个正方形是否发生重叠的gd.core.overlap()方法。
    overlap: function(x1, y1, width1, height1, x2, y2, width2, height2) {

        //WebGL对象从中央开始绘制,而你需要从左上角进行计算,所以需要调整宽高的计算。
        x1 = x1 - (width1 / 2);
        y1 = y1 - (height1 / 2);
        x2 = x2 - (width2 / 2);
        y2 = y2 - (height2 / 2);

        // Test for collision
        return x1 < x2 + width2 &&
            x1 + width1 > x2 &&
            y1 < y2 + width2 &&
            y1 + height1 > y2;
    },

    /* ----- Utilities | Pre-Written w/ credits -----*/
    // Matrix functions modified from Mozilla's WebGL tutorial https://developer.mozilla.org/en/WebGL/Adding_2D_content_to_a_WebGL_context
    // From Mozilla's tutorial "Nobody seems entirely clear on where it came from, but it does simplify the use of Sylvester even further by adding methods for building special types of matrices, as well as outputting HTML for displaying them."
    // 矩阵辅助函数
    loadIdentity: function() {
        // 加载一个单位矩阵,该矩阵由一些1和环绕其四周的0组成。
        mvMatrix = Matrix.I(4);
    },
    multMatrix: function(m) {
        // 乘以一个矩阵。
        mvMatrix = mvMatrix.x(m);
    },
    mvTranslate: function(v) {
        // 执行矩阵乘法运算,然后进行矩阵平移。
        this.multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
    },
    setMatrixUniforms: function() {
        // 设定透视视角与模型视图矩阵。
        var pUniform = gd.gl.getUniformLocation(this.shader.program, "uPMatrix");
        gd.gl.uniformMatrix4fv(pUniform, false, new Float32Array(this.perspectiveMatrix.flatten()));

        var mvUniform = gd.gl.getUniformLocation(this.shader.program, "uMVMatrix");
        gd.gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
    },

    // Additional functions by Vlad Vukicevic at http://blog.vlad1.com/
    mvMatrixStack: [], // 这个堆栈将利用下列方法来控制矩阵数据。

    mvPushMatrix: function(m) { // 将制定数据移动到堆栈顶部。
        if (m) {
            this.mvMatrixStack.push(m.dup());
            mvMatrix = m.dup();
        } else {
            this.mvMatrixStack.push(mvMatrix.dup());
        }
    },

    mvPopMatrix: function() {
        // 在JavaScript中, Pop是一个数组方法,它能将删除数组中最后一个元素,返回这个元素。在这里,mvPopMatrix()要么返回一个出错信息,要么就去除最后一项,并将其返回。
        if (! this.mvMatrixStack.length) {
            throw("Can't pop from an empty matrix stack.");
        }

        mvMatrix = this.mvMatrixStack.pop();
        return mvMatrix;
    },

    mvRotate: function(angle, v) { // cp.core.draw()中触发旋转的方法。
        var inRadians = angle * Math.PI / 180.0;

        var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
        this.multMatrix(m);
    }
};