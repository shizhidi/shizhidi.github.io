function init() {
    var ee = new EventEmitter(); //由于创建了planner对象,所有依赖EventEmitter对象。
    var planner = new Planner(ee); //使用Event Emitter创建一个新的planner对象。
    var render;

    //在firefox中,WebSocket对象被称为MozWebSocket
    if (typeof  MozWebSocket !== 'undefined') { WebSocket = MozWebSocket; }
    var ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = function(msg_json) { //为WebSocket添加一个事件侦听器
        var msg = JSON.parse(msg_json); //假定WebSocket所接受的信息是一种JSON编码对象。
        switch (msg.type) {
            case 'loadPlan':
                //当客户端首次连接时,希望服务器端能够传送一个带有最新版计划的JSON编码的planner对象。
                planner.load_plan(msg.args.plan);
                render = new Renderer(planner);
                break;
            case 'addTask':
                planner.add_task(msg.args.task_name, msg.args.task_id);
                break;
            case 'moveTask':
                planner.move_task(msg.args.task_id, msg.args.task_owner, msg.args.task_status);
                break;
            case 'deleteTask':
                planner.delete_task(msg.args.task_id);
                break;
        }
    };
    ws.onerror = function(e) {
        //便于调试,将错误记录下来并显示到控制台上
        console.log(e.reason);
    };
    //planner对象的on方法连接着一个事件侦听器。当事件被浏览器内的planner对象引发时,侦测到并发送到服务器端。
    planner.on('addTask', function(task) {
        var msg = {};
        msg.type = 'addTask';
        msg.args = { 'task_name': task.name, 'task_id': task.id };
        ws.send(JSON.stringify(msg));
    });
    planner.on('moveTask', function(task) {
        var msg = {};
        msg.type = 'moveTask';
        msg.args = { 'task_id': task.id, 'owner': task.owner, 'status': task.status };
        ws.send(JSON.stringify(msg))
    });
    planner.on('deleteTask', function(task_id) {
        var msg = {};
        msg.type = 'deleteTask';
        msg.args = { 'task_id': task_id };
        ws.send(JSON.stringify(msg))
    });
}