(function() {
  var Tasks = function() {
    var nudge = function() { //在ios设备上,nudge函数会隐藏浏览器工具栏,从而为应用腾出更多的显示空间。
      setTimeout(function(){ window.scrollTo(0,0); }, 1000);
    };
    //获取location.hash的值,并用其定义当前视图。在jump定义好之后,Tasks函数会调用它。
    //由于用户可能会把一个视图加入书签,而不是把任务列表的主视图加入标签,所有Tasks构造函数使用jump来检查location.hash的值,
    //以确定当前视图是否为非默认视图。
    var jump = function() {
      switch(location.hash) {
        case '#add':
          document.body.className = 'add';
          break;
        case '#settings':
          document.body.className = 'settings';
          break;
        default:
          document.body.className = 'list';
      }
      nudge();
    };
    jump();
    //用户通过切换按钮,触发hashchange事件,并执行jump函数。
    window.addEventListener('hashchange', jump, false);

    //在移动设备上,当屏幕方向改变时,如果可能的话,就调用nudge函数隐藏浏览器工具栏。
    window.addEventListener('orientationchange', nudge, false);

    // 5.5 从localStorage 中读取数据
    var localStorageAvailable = ('localStorage' in window);
    var loadSettings = function() {
      if(localStorageAvailable) {
        //使用Storage API的getItem方法来获取localStorage中的数据,如果数据不存在,getItem会返回null值。
        var name = localStorage.getItem('name'),
            colorScheme = localStorage.getItem('colorScheme'),
            nameDisplay = document.getElementById('user_name'),
            nameField = document.forms.settings.name,
            doc = document.documentElement,
            colorSchemeField = document.forms.settings.color_scheme;

        if(name) {
          nameDisplay.innerHTML = name+"'s";
          nameField.value = name;
        } else {
          nameDisplay.innerHTML = 'My';
          nameField.value = '';
        }
        if(colorScheme) {
          doc.className = colorScheme.toLowerCase();
          colorSchemeField.value = colorScheme;
        } else {
          doc.className = 'blue';
          colorSchemeField.value = 'Blue';
        }
      }
    }
    // 5.6 将数据保存到localStorage 中
    var saveSettings = function(e) {
      e.preventDefault();
      if(localStorageAvailable) {
        var name = document.forms.settings.name.value;
        if(name.length > 0) {
          var colorScheme = document.forms.settings.color_scheme.value;
          //使用setItem方法,将数据保存在localStorage中。如果带有该名称的项目已存在,setItem会毫无预警地将其覆盖。
          localStorage.setItem('name', name);
          localStorage.setItem('colorScheme', colorScheme);
          loadSettings(); //保存好数据后,调用loadSettings函数来更新应用设置。
          alert('Settings saved successfully', 'Settings saved');
          location.hash = '#list'; //将location.hash设置为#list,会将视图重定向为任务列表视图。
        } else {
          alert('Please enter your name', 'Settings error');
        }
      } else {
        alert('Browser does not support localStorage', 'Settings error');
      }
    }
    // 5.7 清除localStorage中的数据
    var resetSettings = function(e) {
      e.preventDefault();
      if(confirm('This will erase all data. Are you sure?', 'Reset data')) {
        if(localStorageAvailable) {
          localStorage.clear();
        }
        loadSettings();//当数据被清除后,调用loadSettings函数,应用设置重置为默认值。
        alert('Application data has been reset', 'Reset successful');
        location.hash = '#list'; //重定向到列表
        dropDatabase();
      }
    }
    // 5.8 将UI与localStorage函数连接起来
    loadSettings();
    document.forms.settings.addEventListener('submit', saveSettings, false);//为设置表单的submit和rest事件添加事件侦听器。
    document.forms.settings.addEventListener('reset', resetSettings, false);
    // 5.9 对数据库相关对象的功能侦测
    var indexedDB = window.indexedDB || window.webkitIndexedDB
    || window.mozIndexedDB || window.msIndexedDB || false,
        IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange
    || window.mozIDBKeyRange || window.msIDBKeyRange || false,
        webSQLSupport = ('openDatabase' in window);//检测浏览器是否支持WebSql
    // 5.10 连接并配置数据库
    var db; //使用db来存储数据库连接
    var openDB = function() {
      if(indexedDB) {
        //open是个异步方法。当请求开始后,open会立刻返回一个IDBRequest对象。如果数据库不存在,则创建一个,然后再创建一个与该数据库的链接。
        var request = indexedDB.open('tasks', 1),
            upgradeNeeded = ('onupgradeneeded' in request);//如果requestNeeded是request对象的成员,则表明浏览器支持upgradeNeeded事件。
        request.onsuccess = function(e) {
          db = e.target.result;
          //如果upgradeNeeded事件不存在,则表明浏览器支持已不建议采用的setVersion方法。
          if(!upgradeNeeded && db.version != '1') {
            //如果db.version不等于1,那么就表明不存在对象存储,必须先创建一个对象存储。由于对象存储只有在版本号变更事务中才能创建,
            //所以要增加当前数据库的版本号:调用db.setVersion,并把其中的版本参数设置为1。
            var setVersionRequest = db.setVersion('1');
            setVersionRequest.onsuccess = function(e) {
              var objectStore = db.createObjectStore('tasks', {
                keyPath: 'id'
              });

              //使用createIndex为objectStore创建另一个索引。稍后,将用该索引实现应用的搜索引擎。
              objectStore.createIndex('desc', 'descUpper', {
                unique: false
              });
              loadTasks();
            }
          } else {
            loadTasks();
          }
        }
        if(upgradeNeeded) {
          request.onupgradeneeded = function(e) {//当数据库首次创建时,会调用该事件处理器。
            db = e.target.result;
            var objectStore = db.createObjectStore('tasks', {
              keyPath: 'id'
            });
            objectStore.createIndex('desc', 'descUpper', {
              unique: false
            });
          }
        }
      } else if(webSQLSupport) {
        db = openDatabase('tasks','1.0','Tasks database',(5*1024*1024));//为tasks数据库分配5MB的存储空间
        db.transaction(function(tx) {
          var sql = 'CREATE TABLE IF NOT EXISTS tasks ('+
              'id INTEGER PRIMARY KEY ASC,'+
              'desc TEXT,'+
              'due DATETIME,'+
              'complete BOOLEAN'+
              ')';
          tx.executeSql(sql, [], loadTasks);//使用事物对象tx的executeSql方法创建一个tasks表(不存在的话)。[]参数空,回调函数loadTasks
        });
      }
    }
    openDB();
    // 5.11 为任务项生HTML标记
    var createEmptyItem = function(query, taskList) {
      var emptyItem = document.createElement('li');
      if(query.length > 0) {//如果query不存在,则搜索结果将为0
        emptyItem.innerHTML = '<div class="item_title">'+
          'No tasks match your query <strong>'+query+'</strong>.'+
          '</div>';
      } else {
        emptyItem.innerHTML = '<div class="item_title">'+
          'No tasks to display. <a href="#add">Add one</a>?'+
          '</div>';
      }
      taskList.appendChild(emptyItem);
    };

    //创建并显示一个任务列表项,该任务列表项将包含标题、到期时间。复选框以及删除按钮。
    var showTask = function(task, list) {
      var newItem = document.createElement('li'),
          checked = (task.complete == 1) ? ' checked="checked"' : '';
      newItem.innerHTML =
        '<div class="item_complete">'+
        '<input type="checkbox" name="item_complete" '+
        'id="chk_'+task.id+'"'+checked+'>'+
        '</div>'+
        '<div class="item_delete">'+
        '<a href="#" id="del_'+task.id+'">Delete</a>'+
        '</div>'+
        '<div class="item_title">'+task.desc+'</div>'+
        '<div class="item_due">'+task.due+'</div>';
      list.appendChild(newItem);
      var markAsComplete = function(e) { //当用户选择或取消选择复选框时,就执行markAsComplete事件处理器。
        e.preventDefault();
        var updatedTask = {
          id: task.id,
          desc: task.desc,
          descUpper: task.desc.toUpperCase(),
          due: task.due,
          complete: e.target.checked
        };
        updateTask(updatedTask);
      };
      //当用户点击任务项的删除按钮时,就执行remove事件处理器。
      var remove = function(e) {
        e.preventDefault();
        if(confirm('Deleting task. Are you sure?', 'Delete')) {
          deleteTask(task.id);
        }
      };
      document.getElementById('chk_'+task.id).onchange =
        markAsComplete;//将事件处理器与任务项的复选框和删除按钮连接起来。
      document.getElementById('del_'+task.id).onclick = remove;
    };
    // 5.12 搜索数据库，显示搜索到的任务项
    var loadTasks = function(q) {
      var taskList = document.getElementById('task_list'),
          query = q || '';
      taskList.innerHTML = '';
      if(indexedDB) {
        var tx = db.transaction(['tasks'], 'readonly'),
            objectStore = tx.objectStore('tasks'), cursor, i = 0;
        if(query.length > 0) {
          var index = objectStore.index('desc'),
              upperQ = query.toUpperCase(),
          //在任务描述的大写字母版本上构建一个键规范。将z添加到第2个参数上,这能让所要搜索的任务描述
          //以搜索项开始l否则,就只返回确切匹配的结果。
              keyRange = IDBKeyRange.bound(upperQ, upperQ+'z');
          cursor = index.openCursor(keyRange);
        } else {
          cursor = objectStore.openCursor();
        }
        cursor.onsuccess = function(e) {
          var result = e.target.result;
          if(result == null) return;
          i++;
          showTask(result.value, taskList);
          //利用result['continue'],在索引中找寻下一个匹配项,或是对象存储中的下一个任务(如果没有进行搜索)。
          //如果使用result.continue,则会与javaScript的保留字continue产生冲突。
          result['continue']();
        };
        tx.oncomplete = function(e) {
          if(i == 0) { createEmptyItem(query, taskList); }
        }
      } else if(webSQLSupport) {//如果浏览器不支持IndexedDB,而支持WebSql,则创建一查询,将任务从数据库中取出。
        db.transaction(function(tx) {
          var sql, args = [];
          if(query.length > 0) {
            sql = 'SELECT * FROM tasks WHERE desc LIKE ?';
            args[0] = query+'%';
          } else {
            sql = 'SELECT * FROM tasks';
          }
          var iterateRows = function(tx, results) {
            var i = 0, len = results.rows.length;
            for(;i<len;i++) {
              showTask(results.rows.item(i), taskList);
            }
            if(len === 0) { createEmptyItem(query, taskList); }
          }
          tx.executeSql(sql, args, iterateRows);
        });
      }
    }
    // 5.13 任务搜索功能
    var searchTasks = function(e) {
      e.preventDefault();
      var query = document.forms.search.query.value;
      if(query.length > 0) { //如果输入一个查询条件,将该查询以参数的形式传入loadTasks函数。
        loadTasks(query);
      } else {
        loadTasks();
      }
    };
    //当提交表单,调用searchTasks函数
    document.forms.search.addEventListener('submit', searchTasks, false);
    // 5.添加新任务
    var insertTask = function(e) {
      e.preventDefault();
      var desc = document.forms.add.desc.value,
          dueDate = document.forms.add.due_date.value;
      if(desc.length > 0 && dueDate.length > 0) {
        //构建一个要存储到数据库中的task对象。这里的关键内容是用于表示当前时间的id属性,另外,为了实现不区分大小写地进行索引,
        //还存储了任务描述的大写版本。
        var task = {
          id: new Date().getTime(),
          desc: desc,
          descUpper: desc.toUpperCase(),
          due: dueDate,
          complete: false
        };
        if(indexedDB) {
          var tx = db.transaction(['tasks'], 'readwrite');
          var objectStore = tx.objectStore('tasks');
          var request = objectStore.add(task);//使用IndexedDB add方法将任务添加到对象存储中。
          tx.oncomplete = updateView;//当任务被成功添加后,会调用事件处理器updateView。updateView的定义出现在insertTask后面。

        } else if(webSQLSupport) { //为支持Web Sql的回退方案,使用insert语句来添加任务。
          db.transaction(function(tx) {
            var sql = 'INSERT INTO tasks(desc, due, complete) '+
                'VALUES(?, ?, ?)',
                args = [task.desc, task.due, task.complete];
            tx.executeSql(sql, args, updateView);
          });
        }
      } else {
        alert('Please fill out all fields', 'Add task error');
      }
    };
    //updateView从数据库中加载任务,清除添加任务表单中的输入字段,并将视图切换到任务列表视图。
    function updateView(){
      loadTasks();
      alert('Task added successfully', 'Task added');
      document.forms.add.desc.value = '';
      document.forms.add.due_date.value = '';
      location.hash = '#list';
    }
    //将事件处理器insertTask添加到添加任务表单的提交按钮上。
    document.forms.add.addEventListener('submit', insertTask, false);
    // 5.15 更新并删除任务
    var updateTask = function(task) {
      if(indexedDB) {
        var tx = db.transaction(['tasks'], 'readwrite');
        var objectStore = tx.objectStore('tasks');
        //使用put方法,将task对象作为参数传入,以便在数据库中更新任务。task对象必须有正确的键值,
        //否则数据库就会创建一个新的对象而不是更新已有对象。
        var request = objectStore.put(task);
      } else if(webSQLSupport) {
        var complete = (task.complete) ? 1 : 0;
        db.transaction(function(tx) {
          var sql = 'UPDATE tasks SET complete = ? WHERE id = ?',
              args = [complete, task.id];
          tx.executeSql(sql, args);
        });
      }
    };
    var deleteTask = function(id) {
      if(indexedDB) {
        var tx = db.transaction(['tasks'], 'readwrite');
        var objectStore = tx.objectStore('tasks');
        //使用delete方法去除一个任务。有些浏览器会检查这里是否使用了点标记法。由于在JavaScript中,delete是个保留字,
        //所以为了安全起见,使用方括号标记法。
        var request = objectStore['delete'](id);
        //删除成功后,加载任务列表视图,显示更新后的任务列表。
        tx.oncomplete = loadTasks;
      } else if(webSQLSupport) {
        db.transaction(function(tx) {
          var sql = 'DELETE FROM tasks WHERE id = ?',
              args = [id];
          tx.executeSql(sql, args, loadTasks);
        });
      }
    }
    // 5.16 删除数据库
    var dropDatabase = function() {
      if(indexedDB) {
        //使用deleteDatabase方法来删除整个任务数据库。
        var delDBRequest = indexedDB.deleteDatabase('tasks');
        //重新加载页面,初始化一个load事件。这将触发load时机处理器,创建一个数据库的干净拷贝。
        delDBRequest.onsuccess = window.location.reload();
      } else if(webSQLSupport) {
        db.transaction(function(tx) {
          var sql = 'DELETE FROM tasks';
          //在WebSql回退方案中,是清除任务表,而不是将整个数据库删除。
          tx.executeSql(sql, [], loadTasks);
        });
      }
    }
    // 5.18 侦测与加载自动更新
    if('applicationCache' in window) { //侦测用户所用的浏览器是否支持ApplicationCacheAPI
      var appCache = window.applicationCache;
      appCache.addEventListener('updateready', function() {
        //updateready触发时,浏览器已经重新下载了清单文件上的资源,并创建了新缓存。updateready的事件处理器将调用swapCache,
        //用新的缓存替代既有缓存。
        appCache.swapCache();
        //询问用户是否现在就更新应用。如果是,页面将使用新缓存来重新加载;否则,新的缓存将在下应用加载时再使用。
        if(confirm('App update is available. Update now?')) {
          w.location.reload();
        }
      }, false);
    }
  }
  window.addEventListener('load', function() {
    new Tasks();
  }, false);
})();





