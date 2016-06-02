/*
Name: Game Utilities
Version: 1.0
Author: Ashton Blue
Author URL: http://blueashes.com
Publisher: Manning

Desc: Contains a series of re-usable game functions for
interacting with the engine.
*/

var gd = gd || {};

gd.game = {
    // Creates a new object from a class
    // 在指定名称和类型字符串后,gd.game.spawn()会生成任意的实体模板。如果声明了某种额外参数,它还可以将其传入init()方法中。
    spawn: function(name, params) {
        // temporarily store item for reference purposes
        var entity = new gd.template[name];

        // Set the id, faster for object searching than a object comparison
        entity.id = gd.core.id.get();

        // Store entity in main array
        // 将新创建的实体放入storage中。
        gd.core.storage.all.push(entity);

        // Store in sub arrays for faster collision detection
        switch (entity.type) {
            case 'a':
                gd.core.storage.a.push(entity);
                break;
            case 'b':
                gd.core.storage.b.push(entity);
                break;
            default:
                break;
        }

        // Apply the passed parameters as an init via Curry
        if (arguments.length > 1 && entity.init) {
            // Remove name argument
            //如果为init()添加额外的参数,通过一个预填充函数参数的局部套用技术被传入
            var args = [].slice.call(arguments, 1);
            // Fire the init with proper arguments
            entity.init.apply(entity, args);
        } else if (entity.init) {
            entity.init();
        }
    },

    // Detects if boundaries have been violated and fires a callback if so

    // 轻松设置逻辑离开游戏的可玩区域。由于3D环境的单位都是主观的,需要以后手动设置游戏的宽高值。因为没有默认值,多数3D引擎都能自定义设置单位度量方案。
    boundaries: function(obj, top, right, bottom, left, offset) {
        if (offset === undefined)
            offset = 0;

        if (obj.x < - this.size.width - offset) {
            return left.call(obj);
        } else if (obj.x > this.size.width + offset) {
            return right.call(obj);
        } else if (obj.y < -this.size.height - offset) {
            return bottom.call(obj);
        } else if (obj.y > this.size.height + offset) {
            return top.call(obj);
        }
    },

    // Basic equation for rotation based upon time
    // Originally from Mozilla's WebGL tutorial https://developer.mozilla.org/en/WebGL/Animating_objects_with_WebGL
    // 使对象绕其中心旋转的旋转函数(Mozilla的WebGL教程最先公布该函数)
    rotate: function(obj) {
        var currentTime = Date.now();
        if (obj.lastUpdate < currentTime) {
            var delta = currentTime - obj.lastUpdate;

            obj.rotate.angle += (30 * delta) / obj.rotate.speed;
        }
        obj.lastUpdate = currentTime;
    },


    // Random number generators
    // 用于生成随机数的辅助函数。
    random: {
        polarity: function() {
            return Math.random() < 0.5 ? -1 : 1;
        },
        number: function(max, min) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }
    }
};