var Planner = function(ee) { //创建planner对象,接收EventEmitter参数
    var plan = {};
    plan.tasks = [];
    plan.workers = [];
    plan.statuses = ['todo','inprogress','done']; //设置一些私有变量
    var Task = function(task_name, task_id) { //创建新任务的工具函数
        var that = {};
        that.name = task_name;
        if (typeof task_id === 'undefined') {
            that.id = guidGenerator();
        } else {
            that.id = task_id;
        }
        that.owner = '';
        that.status = '';
    }
    function get_task(task_id) { //从计划中挑选任务的函数
        return plan.tasks[get_task_index(task_id)];
    }
    function get_task_index(task_id) {
        for (var i = 0; i < plan.tasks.length; i++) {
            if (plan.tasks[i].id == task_id) { return i; }
        }
        return -1;
    }
    function guidGenerator() { //返回伪 GUID (全局唯一标识符)的工具函数,以便让计划中创建的所有对象都能有唯一的ID。
        var S4 = function() {
           return (((1+Math.random())*0x10000)|0) .toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }
    //在计划板应用中侦听onmessage时间
    window.addEventListener('message', receiver, false);
    function receiver(e) {
        if (e.origin == 'http://localhost') {
            var msg = JSON.parse(e.data);
            switch (msg.type) {
                case 'getWordList':
                    var words = planner.get_words(msg.params.letters);
                    var el = document.getElementsByTagName('iframe')[0].contentWindow;
                    var response = {};
                    response.type = 'wordList';
                    response.params = {};
                    response.params.words = words;

                    el.postMessage(JSON.stringify(response),'http://localhost:8080');
                    break;
            }
        }
    }
    var that = { //that对象被planner构造函数返回,它就会通过JavaScript的closure特性来访问planner的私有函数
        load_plan: function(new_plan) {
            //IRL, put validation logic in here
            //在实际应用中,会在这添加验证逻辑来检查JSON字符串是否组成了一个合法的计划。
            plan = JSON.parse(new_plan);
            ee.emit('loadPlan',plan);
        },
        get_plan: function() {
            return JSON.stringify(plan);
        },
        //在add_task方法中,task_id参数是可选的,当任务创建时,就不需要这个参数了;但当这一时间被复制传送到服务器端或其他的客户端上时,就需要用到这个参数。
        add_task: function(task_name, task_id, source) {
            var task = Task(task_name, task_id);
            //将创建的任务与工具函数一起推送入计划的任务数组中。
            plan.tasks.push(task);
            ee.emit('addTask', task, source);//发动新任务的事件
            return task.id;
        },
        move_task: function(task_id, owner, status, source) {
            var task = get_task(task_id);
            task.owner = owner;
            task.status = status;
            ee.emit('moveTask', task, source);
        },
        delete_task: function(task_id, source) {
            var task_index = get_task_index(task_id);
            if (task_index >= 0) {
                var head = plan.tasks.splice(task_index,1);
                head.concat(plan.tasks);
                plan.tasks = head;
                ee.emit('deleteTask', task_id, source);
            }
        },
        add_worker: function(worker_name, source) {
            var worker = {};
            worker.name = worker_name;
            worker.id = guidGenerator();
            plan.workers.push(worker);
            ee.emit('addWorker', worker, source);
        },
        delete_worker: function(worker_name, source) { //该方法会将worker的所有任务都移动到队列中,然后删除worker。
            var worker;
            for (var i=0; i < plan.workers.length; i++) {
                if (plan.workers[i].name == worker_name) { worker = plan.workers[i]; }
            }
            if (typeof worker !== 'undefined') {
                for (var j=0; j < worker.statuses.length; j++) {
                    var tasks = worker.statuses[j];
                    for (var k=0; k < tasks.length; k++) {
                        plan.free_tasks.push(tasks[k]);
                    }
                }
                ee.emit('deleteWorker', worker, source)
            }
        },
        get_words: function(letters) {
            var words = [];
            for (var i=0; i<plan.tasks.length; i++) {
                var tokens = plan.tasks[i].name.split(' ');
                for (var j=0; j<tokens.length; j++) {
                    if (tokens[j].length > 2 && tokens[j].indexOf(letters) > -1) {
                        words.push(tokens[j]);
                    }
                }
            }
            return words;
        },
        eachListener: ee.eachListener,
        addListener: ee.addListener,
        on: ee.on, //利用on方法在计划对象上添加事件侦听器
        once: ee.once,
        removeListener: ee.removeListener,
        removeAllListeners: ee.removeAllListeners,
        listeners: ee.listeners,
        emit: ee.emit,
        setMaxListeners: ee.setMaxListeners
    };
    return that;
};