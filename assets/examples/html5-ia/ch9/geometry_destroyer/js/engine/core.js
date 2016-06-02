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

            // Check for the type of shader accessed and process as necessary
            if (this.script.type === 'x-shader/x-fragment') {
                this.shader = gd.gl.createShader(gd.gl.FRAGMENT_SHADER);
            } else if (this.script.type === 'x-shader/x-vertex') {
                this.shader = gd.gl.createShader(gd.gl.VERTEX_SHADER);
            } else {
                return null; // Type of current shader is unknown
            }

            // Get data and compile it together
            gd.gl.shaderSource(this.shader, this.source);
            gd.gl.compileShader(this.shader);

            // Compile success? If not fire an error.
            if (!gd.gl.getShaderParameter(this.shader, gd.gl.COMPILE_STATUS)) {
                alert('Shader compiling error: ' + gd.gl.getShaderInfoLog(this.shader));
                return null;
            }

            // Give back the shader so it can be used
            return this.shader;
        },

        // Stores shader data in other places for easy usage later
        store: function() {
            // Store the shader's attribute in an object so you can use it again later
            this.vertexPositionAttribute = gd.gl.getAttribLocation(this.program, "aVertexPosition");
            gd.gl.enableVertexAttribArray(this.vertexPositionAttribute);

            // Allow usage of color data with shaders
            this.vertexColorAttribute = gd.gl.getAttribLocation(this.program, "aVertexColor");
            gd.gl.enableVertexAttribArray(this.vertexColorAttribute);
        }
    },

    draw: function() {
        gd.gl.clear(gd.gl.COLOR_BUFFER_BIT | gd.gl.DEPTH_BUFFER_BIT);

        // Field of view in degress, width/height, only get objects between 1, 300 units in distance
        this.perspectiveMatrix = makePerspective(45, this.horizAspect, 0.1, 300.0);

        // Loop through every object in storage.all
        for (var i in this.storage.all) {
            // Resets and creates a matrix that has 1s diagnolly and 0s everywhere else, crazy math stuff
            // Essential in processing your matrices for object creation
            // If you are a math nut and really want to understand this read http://mathworld.wolfram.com/IdentityMatrix.html
            /* Basic idea/example of this matrix
            [ 1, 0, 0
              0, 1, 0
              0, 0, 1 ]
            */
            this.loadIdentity();

            // Run update functions before drawing anything to prevent screen pops for recently spawned items
            this.storage.all[i].update();

            // Draw at location x, y, z
            // Other objects drawn before refreshing will be drawn relative to this position
            this.mvTranslate(this.storage.all[i].position());
            this.mvPushMatrix();

            // Pass rotate data if present
            if (this.storage.all[i].rotate.axis) {
                this.mvRotate(
                    this.storage.all[i].rotate.angle,
                    this.storage.all[i].rotate.axis);
            }

            // Pass shape data
            gd.gl.bindBuffer(
                gd.gl.ARRAY_BUFFER,
                this.storage.all[i].shapeStorage);
            gd.gl.vertexAttribPointer(
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

            this.setMatrixUniforms();

            // Take the matrix vertex positions and go through all of the elements from 0 to the .numItems object
            if (this.storage.all[i].indicesStorage) {
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
            this.mvPopMatrix();

            // Collision detection for 2D elements only
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
        this.graveyard.purge();
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
    loadIdentity: function() {
        mvMatrix = Matrix.I(4);
    },
    multMatrix: function(m) {
        mvMatrix = mvMatrix.x(m);
    },
    mvTranslate: function(v) {
        this.multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
    },
    setMatrixUniforms: function() {
        var pUniform = gd.gl.getUniformLocation(this.shader.program, "uPMatrix");
        gd.gl.uniformMatrix4fv(pUniform, false, new Float32Array(this.perspectiveMatrix.flatten()));

        var mvUniform = gd.gl.getUniformLocation(this.shader.program, "uMVMatrix");
        gd.gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
    },

    // Additional functions by Vlad Vukicevic at http://blog.vlad1.com/
    mvMatrixStack: [],

    mvPushMatrix: function(m) {
        if (m) {
            this.mvMatrixStack.push(m.dup());
            mvMatrix = m.dup();
        } else {
            this.mvMatrixStack.push(mvMatrix.dup());
        }
    },

    mvPopMatrix: function() {
        if (! this.mvMatrixStack.length) {
            throw("Can't pop from an empty matrix stack.");
        }

        mvMatrix = this.mvMatrixStack.pop();
        return mvMatrix;
    },

    mvRotate: function(angle, v) {
        var inRadians = angle * Math.PI / 180.0;

        var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
        this.multMatrix(m);
    }
};