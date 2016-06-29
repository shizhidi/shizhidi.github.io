/**
 * Created by dell on 2016/5/27.
 */

(function($,window,document){
    'use strict';
    var pluginName = "imprInclin3dChart",
        defaults = {
            enableZoom : false,      //是否可以放大
            LineBasicMaterialColor : 0xffffff,
            LineBasicMaterialOpacity : 0.5,
            radiusTop : 5,
            radiusBottom : 5,
            height : 22,
            radiusSegments : 64,
            heightSegments : 1,
            openEnded : false,
            thetaStart : 0,
            thetaLength : Math.PI * 2,
            twoPi : Math.PI * 2,
            oneDeg : Math.PI / 180,   //每度的弧度数
            maxValue : 0,             //所有数据的最大值
            alarmValue : 0.05,        //报警值
            maxNumber : 10,           //允许的最大曲线数
            startColor : 0            //开始的颜色值 例: rgb(255,0,0)  设置30 为rgb(30,0,0)
        };

    function inclin3dChart(element, options){
        this.element = element;
        this.$element = $(element);
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.version = 'v1.0.0';

        this.realTimer = new realDataTime(Constant.getConstants('REALDATATIME'));

        this.originalData = [
            {direction:30,angle:0.0198,time:1462428620},
            {direction:33,angle:0.0227,time:1462428620},
            {direction:36,angle:0.0173,time:1462428620},
            {direction:34,angle:0.0232,time:1462428620},
            {direction:36,angle:0.0208,time:1462428620},
            {direction:35,angle:0.0226,time:1462428620},
            {direction:35,angle:0.0223,time:1462428620},
            {direction:32,angle:0.0194,time:1462428620},
            {direction:30,angle:0.0182,time:1462428620},
            {direction:30,angle:0.0199,time:1462428620}
        ];
        this.originalData3D = [];
    }

    inclin3dChart.prototype = {
        init : function(){
            if ($.util.isEmptyObjectOrNull(this.settings.isFoverView)) {
                if ($.util.isEmptyObjectOrNull(this.tabParam.ribbonData) || $.util.isEmptyObjectOrNull(this.tabParam.treeData)) return;
                this.treeNode = this.tabParam.treeData;
            } else if (this.settings.isFoverView) {
                if ($.util.isEmptyObjectOrNull(this.settings.treeNode)) return;
                this.treeNode = this.settings.treeNode;
            }
            debugger;
            //如果没有动态测点就不显示
            var positionNode = getSinglePoint(this.treeNode,
                Constant.getConstants('NODE_TYPE').PositionVO,
                Constant.getConstants('POSITION_TYPE').PERPENDICULARITY);

            if (!$.util.isObject(positionNode)) {
                positionNode = getSinglePoint(this.treeNode,
                    Constant.getConstants('NODE_TYPE').PositionVO,
                    Constant.getConstants('POSITION_TYPE').PERPENDICULARITYdy);
            }


            var positionVO = positionNode.attributes.get('PositionVO');
            this.positionVO = positionVO;
            var positionConfig = JSON.parse(positionVO.pos_xml_config);
            if (!$.util.isEmptyObjectOrNull(positionConfig.b_Config.j_timeInv) && positionConfig.b_Config.j_timeInv != 1) {
                this.realTimer.time = positionConfig.b_Config.j_timeInv * 1000 / 2;
            }
            this.positionType = positionVO.position_type;

            var $this = this;
            var width = this.$element.width(),height = this.$element.height();

            window.scene = new THREE.Scene();
            window.camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 50 );
            window.camera.position.z = 22;

            window.renderer = new THREE.WebGLRenderer( { antialias: true } );
            window.renderer.setPixelRatio( window.devicePixelRatio );
            window.renderer.setSize( width, height );

            //创建dom添加canvas
            var $div = $("<div id='inclin3DChart'></div>");
            $div.css({"position":"absolute","left":0,"top":0,"width":width+'px',"height":height+'px'});
            $div.append(window.renderer.domElement);
            this.$element.append( $div );

            window.orbit = new THREE.OrbitControls( window.camera, window.renderer.domElement );
            window.orbit.enableZoom = this.enableZoom;

            window.ambientLight = new THREE.AmbientLight( 0x000000 );
            window.scene.add( window.ambientLight );

            var lights = [];
            lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
            lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
            lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );

            lights[ 0 ].position.set( 0, 200, 0 );
            lights[ 1 ].position.set( 100, 200, 100 );
            lights[ 2 ].position.set( - 100, - 200, - 100 );

            window.scene.add( lights[ 0 ] );
            window.scene.add( lights[ 1 ] );
            window.scene.add( lights[ 2 ] );

            window.mesh = new THREE.Object3D();

            window.mesh.add( new THREE.LineSegments(

                new THREE.Geometry(),

                new THREE.LineBasicMaterial( {
                    color : 0xffffff,
                    transparent : true,
                    opacity : 0.1
                } )

            ) );

//            this.randomNumber();

            this.addCircles();

            this.LoadFonts();

            this.options = this.CylinderGeometry();

            window.mesh.rotation.x = 1.06;
            window.scene.add(window.mesh);

            window.render = function () {

                requestAnimationFrame( window.render );

                var time = Date.now() * 0.001;
                /*if ( ! this.options.fixed ) {
					mesh.rotation.y += 0.005;
                    console.log(mesh.rotation.x);
                }*/

                window.renderer.render( window.scene, window.camera );

            };

            render();

            this.$element.on("resize", function() {
                var $element = $(this);
                window.camera.aspect = $element.width() / $element.height();
                window.camera.updateProjectionMatrix();

                window.renderer.setSize( $element.width(), $element.height());
            });

            this.realTimer.options = {
                obj: this
            };
            this.realTimer.handle = function() {

                this.options.obj.initRealData();
                this.stop();
            };
            this.realTimer.run();
        },
        randomNumber : function(){
            if (this.originalData.length != 0) this.originalData.length = 0;
            for (var i = 0 ; i < this.settings.maxNumber; i++ ) {
                this.originalData.push({
                    direction: Math.random()*10 + 30,
                    angle: Math.random()*0.1,
                    time: 14623134564
                });
            }
        },
        CylinderGeometry : function(){
            var geometry = new THREE.CylinderGeometry(
                this.settings.radiusTop,
                this.settings.radiusBottom,
                this.settings.height,
                this.settings.radiusSegments,
                this.settings.heightSegments,
                this.settings.openEnded,
                this.settings.thetaStart,
                this.settings.twoPi
            );

            window.mesh.children[ 0 ].geometry.dispose();

            window.mesh.children[ 0 ].geometry = geometry;

            return {};
        },
        /**
         * 添加立方体的二次贝塞尔曲线
         */
        addCurve : function(calcArr){
            var $this = this;
            calcArr.forEach(function(val,index,array){
                var avgColor = parseInt((255-$this.settings.startColor) / $this.settings.maxNumber);
                var curve = new THREE.CubicBezierCurve3(
                    new THREE.Vector3( val[0].x[2], 11, val[0].z[2] ),
                    new THREE.Vector3( val[0].x[1], 8, val[0].z[1] ),
                    new THREE.Vector3( val[0].x[0], 4, val[0].z[0] ),
                    new THREE.Vector3( 0, -11, 0 )
                );

                var geometry = new THREE.Geometry(),color = 'rgb(0,'+ ($this.settings.startColor+avgColor*(index+1)) +',0)';
                geometry.vertices = curve.getPoints( 50 );

//                    if ( originalData[index].angle > alarmValue){
//                        color = 'rgb(255,0,0)';
//                    }

                var line = new THREE.Line(
                    geometry,
                    new THREE.LineBasicMaterial( {
                        color : color,
                        linewidth : 1.5
                    } )
                );

                line.name = 'curve';

                window.mesh.add(line);
            });
        },
        /**
         * 按比例尺换算所需的3D数据点
         */
        conversion : function(){
            var $this = this;
            $this.settings.maxValue = d3.max($this.originalData.map(function(o){
                return o.angle;
            }));
            $this.settings.maxValue += 0.05;
            var scale = d3.scale.linear()
                .domain([0,$this.settings.maxValue])
                .range([0,5]),oneDeg = $this.settings.oneDeg;

            $this.originalData.forEach(function(val,index,array){
                var tempData = [],cxArray = [],cyArray = [];
                var cx = scale(val.angle) * Math.cos(oneDeg*val.direction - Math.PI/2);
                var cy = scale(val.angle) * Math.sin(oneDeg*val.direction - Math.PI/2);
                var avgCx = cx / 3;
                var avgCy = cy / 3;
                for (var i = 1; i <= 2; i++){
                    cxArray.push(avgCx * i);
                    cyArray.push(avgCy * i);
                }
                cxArray.push(cx);
                cyArray.push(cy);
                tempData.push({
                    x : cxArray,
                    z : cyArray
                });
                $this.originalData3D.push(tempData);
            });
        },
        /**
         * 添加图谱上的弧度数
         */
        addRadian : function(){
            var $this = this;
            var avgVal = $this.settings.maxValue / 5;
            var data = {
                text : '',
                size : 5,
                height : 2,
                curveSegments : 12,
                font : "helvetiker",
                weight : "regular",
                bevelEnabled : false,
                bevelThickness : 1,
                bevelSize : 0.5
            };
            var loader = new THREE.FontLoader();

            loader.load( 'ms8000/js/chart/inclin3DChart/fonts/' + data.font + '_' + data.weight + '.typeface.js', function ( font ) {
                var radius = [1,3,5],oneDeg = $this.settings.oneDeg;
                for (var j = 0; j <= 3; j++){
                    if (j == 0){
                        data.text = '0';
                    }else{
                        var tempNub = (avgVal * radius[j-1]);
                        data.text = tempNub.toFixed(4);
                    }
                    var geometry = new THREE.TextGeometry( data.text, {
                        font: font,
                        size: data.size,
                        height: data.height,
                        curveSegments: data.curveSegments,
                        bevelEnabled: data.bevelEnabled,
                        bevelThickness: data.bevelThickness,
                        bevelSize: data.bevelSize
                    } );

                    switch (j){
                        case 0:
                            geometry.center();
                            geometry.rotateX(oneDeg*-90);
                            geometry.scale(0.05,0.05,0.05);
                            geometry.translate ( 0.2, 11, -0.3 );
                            break;
                        case 1:
                            geometry.center();
                            geometry.rotateX(oneDeg*-90);
                            geometry.scale(0.05,0.05,0.05);
                            geometry.translate ( 1.8, 11, -0.3 );
                            break;
                        case 2:
                            geometry.center();
                            geometry.rotateX(oneDeg*-90);
                            geometry.scale(0.05,0.05,0.05);
                            geometry.translate ( 3.6, 11, -0.3 );
                            break;
                        case 3:
                            geometry.center();
                            geometry.rotateX(oneDeg*-90);
                            geometry.scale(0.05,0.05,0.05);
                            geometry.translate ( 5.6, 11, -0.3 );
                            break;
                        default :
                            break;
                    }


                    var radian = new THREE.Mesh(
                        geometry,
                        new THREE.MeshPhongMaterial({
                            color: 0x156289,
                            emissive: 0x072534,
                            side: THREE.DoubleSide,
                            shading: THREE.FlatShading
                        })
                    );

                    radian.name = 'radian';

                    window.mesh.add(radian);
                }
            });
        },
        addCircles : function(){
            var radius = [1,3,5];
            for (var i = 0; i <= 2; i++){
                var geometry = new THREE.CircleGeometry( radius[i], 64 );
                geometry.translate ( 0, 0, -11 );
                geometry.rotateX(this.settings.oneDeg*90);
//                geometry.rotateY(oneDeg*90);
                var circle = new THREE.Line(
                    geometry,
                    new THREE.LineBasicMaterial( {
                        color: 0xffffff,
                        transparent: true,
                        opacity: 1
                    } )
                );

                circle.name = 'circle';

                window.mesh.add(circle);
            }
        },
        LoadFonts : function(){
            //载入stl文字 ['north','east','south','west']
            var fonts = ['north','east','south','west'],oneDeg = this.settings.oneDeg,$this = this;
            fonts.forEach(function(val,index,arr){
                var loader = new THREE.STLLoader();
                loader.addEventListener('load', function(event) {
                    if (geometry) geometry.dispose();
                    var geometry = event.content;
                    var material = new THREE.MeshPhongMaterial({
                        color: 0x156289,
                        emissive: 0x072534,
                        side: THREE.DoubleSide,
                        shading: THREE.FlatShading
                    });
                    //转换角度
                    switch (val){
                        case 'north':
                            geometry.scale(0.6,0.6,0.6);
                            geometry.translate ( -2.4, 3, -11 );
                            geometry.rotateX(oneDeg*-90);
                            break;
                        case 'east':
                            geometry.scale(0.6,0.6,0.6);
                            geometry.translate ( 5.5, -1, -11 );
                            geometry.rotateX(oneDeg*-90);
                            break;
                        case 'south':
                            geometry.scale(0.6,0.6,0.6);
                            geometry.translate ( -2, -9, -11 );
                            geometry.rotateX(oneDeg*-90);
                            break;
                        case 'west':
                            geometry.scale(0.6,0.6,0.6);
                            geometry.translate ( -8, -1, -11 );
                            geometry.rotateX(oneDeg*-90);
                            break;
                        default :
                            break;
                    }

                    var font = new THREE.Mesh(geometry, material);
                    font.name = 'font';

                    window.mesh.add(font);

                });
                loader.load('ms8000/js/chart/inclin3DChart/fonts/'+val+'.STL');
            });
        },
        resize : function(){
            var $this = this.$element;
            var $div = $this.children('#inclin3DChart');
            /*if (!isNaN($this.width())) {
                $div._outerWidth($this.width() / 2);
            } else {
                $div.width("auto");
            }
            if (!isNaN($this.height())) {
                $div._outerHeight($this.height() / 2);
            } else {
                $div.height("auto");
            }
            var data = $div.data('plugin.imprGauge');
            if (!$.util.isEmptyObjectOrNull(data)) {
                data.resize();
            }*/
        },
        destroy: function() {
            this.$element.removeData('plugin.' + pluginName);
        },
        initRealData: function(){

            var mdata = null;
            this.realTimer.options = {
                obj: this
            };

            this.realTimer.handle = function() {
                if ($.util.isEmptyObjectOrNull(this.options.obj)) return;
                var $that = this.options.obj;
                var positionVO = $that.positionVO;
                realDataManager.getRealMap(positionVO.machine_id, positionVO.position_type, function(data) {
                    if ($.util.isEmptyObjectOrNull(data) || data.length <= 0){
                        return;
                    }else{
                        mdata = data[0];

                        if ($that.originalData.length > 0) $that.originalData.length = 0;
                        //根据数据动态在图谱上显示曲线
                        $that.originalData = mdata.inc_wave;

                        $that.settings.maxNumber = mdata.inc_wave.length > 255 ? 255 : mdata.inc_wave.length;

                        $that.conversion();
                        $that.addRadian();

                        var inc_wave = [];

                        //500毫秒一个点绘制到图谱上
                        $that.inteval = setInterval(function(){
                            var temp_wave = $that.originalData3D.shift();
                            if ($.util.isObject(temp_wave)) clearInterval($that.inteval);
                            inc_wave.push(temp_wave);
                            $that.addCurve(inc_wave);
                        },500);

                    }

                })
            };
            this.realTimer.run();
        },
        startRealData: function() {
            this.realTimer.run();
        },
        stopRealData: function() {
            this.realTimer.stop();
            clearInterval(this.inteval);
        }

    };

    $.fn[pluginName] = function(options) {
        return this.each(function() {
            var element = $(this);

            // Return early if this element already has a plugin instance
            if (element.data('plugin.' + pluginName)) {
                element.removeData('plugin.' + pluginName);
            }
            // Pass options and element to the plugin constructer
            var pluginData = new inclin3dChart(this, options);
            // Store the plugin object in this element's data
            element.data('plugin.' + pluginName, pluginData);
            pluginData.init();
        });
    }

})($,window,document);