(function() {
  var SuperEditor = function() {
    //视图导航与状态管理
    var view, fileName, isDirty = false,
        unsavedMsg = 'Unsaved changes will be lost. Are you sure?',
        unsavedTitle = 'Discard changes';
    //以上变量用于存储当前视图与文件名(判断是否在文件编辑器视图中),以及一个用来文档是否被修改(isDirty)

    var markDirty = function() {
      isDirty = true;
    };
    var markClean = function() {
      isDirty = false;
    };
    var checkDirty = function() {
      if(isDirty) { return unsavedMsg; }
    };

    //如果用户试图关闭当前浏览器窗口或者导航至其他页面,你将检查他们是否修改后未保存,如果必要的话,可以对这种行为警告用户。
    window.addEventListener('beforeunload',  checkDirty, false);

    //jump事件处理器利用URL的散列值来切换两种视图。
    var jump = function(e) {
      var hash = location.hash;
      if(hash.indexOf('/') > -1) { //如果URL散列值包含一个斜杠,则它将为斜杠后的文件(如果存在的话)呈现文件编辑器视图。
        var parts = hash.split('/'),
            fileNameEl = document.getElementById('file_name');
        view = parts[0].substring(1) + '-view';
        fileName = parts[1];
        fileNameEl.innerHTML = fileName;
      } else {
        if(!isDirty || confirm(unsavedMsg, unsavedTitle)) {
          markClean();
          view = 'browser-view';
          if(hash != '#list') {
            location.hash = '#list';
          }
        } else {
          location.href = e.oldURL;
        }
      }
      document.body.className = view; //利用<body>元素中的类属性来指定当前视图。必要时,由CSS负责显示或隐藏视图。
    };
    jump();
    window.addEventListener('hashchange', jump, false); //当页面加载或URL散列值变更时,条用jump函数。

    //开启designMode,连接两种编辑器
    var editVisualButton = document.getElementById('edit_visual'),
        visualView = document.getElementById('file_contents_visual'),
        visualEditor = document.getElementById('file_contents_visual_editor'),
        visualEditorDoc = visualEditor.contentDocument,
        editHtmlButton = document.getElementById('edit_html'),
        htmlView = document.getElementById('file_contents_html'),
        htmlEditor = document.getElementById('file_contents_html_editor');

    visualEditorDoc.designMode = 'on';//开启designMode属性,将可视化编辑器iframe切换到可编辑状态。

    visualEditorDoc.addEventListener('keyup', markDirty, false); //当用户在任何一种编辑器状态下进行改动后,将文件标记为dirty状态。
    htmlEditor.addEventListener('keyup', markDirty, false);

    //更新可视化编辑器的内容。UpdateVisual-Editor每次执行后,都会构建一个新文档,因此必须添加一个新的keyup事件。
    var updateVisualEditor = function(content) {
      visualEditorDoc.open();
      visualEditorDoc.write(content);
      visualEditorDoc.close();
      visualEditorDoc.addEventListener('keyup', markDirty, false);
    };
    var updateHtmlEditor = function(content) { //更新HTML编辑器内容
      htmlEditor.value = content;
    };
    var toggleActiveView = function() { //用于切换可视化编辑器与HTML编辑器的事件处理器。当更新HTML编辑器时,XMLSerializer对象会取回iframe元素中的HTML内容。
      if(htmlView.style.display == 'block') {
        editVisualButton.className = 'split_left active';
        visualView.style.display = 'block';
        editHtmlButton.className = 'split_right';
        htmlView.style.display = 'none';
        updateVisualEditor(htmlEditor.value);
      } else {
        editHtmlButton.className = 'split_right active';
        htmlView.style.display = 'block';
        editVisualButton.className = 'split_left';
        visualView.style.display = 'none';

        var x = new XMLSerializer();
        var content = x.serializeToString(visualEditorDoc);
        updateHtmlEditor(content);
      }
    }
    editVisualButton.addEventListener('click', toggleActiveView, false);
    editHtmlButton.addEventListener('click', toggleActiveView, false);

    //在可视化编辑器中实现富文本编辑工具栏
    var visualEditorToolbar =
        document.getElementById('file_contents_visual_toolbar');

    var richTextAction = function(e) { //事件处理器RichTextAction应用于可视化编辑器工具栏上的所有按钮。当用户点击工具栏按钮时,该事件处理器会判断用户点击的到底是什么按钮。
      var command,
          node = (e.target.nodeName === "BUTTON") ? e.target :
      e.target.parentNode;
      if(node.dataset) { //dataset对象便利于访问HTML5的data-*属性。如果浏览器不支持,应用汇回退采用getAttribute方法。
        command = node.dataset.command;
      } else {
        command = node.getAttribute('data-command');
      }
      var doPopupCommand = function(command, promptText, promptDefault) { //由于该应用需要一种自定义UI,所以将showUI设置为false。第三个参数value被传入一个(window对象的)prompt方法,它共有两个字符串参数,
                                                                          //第一个参数提示用户输入值,另一个参数含有默认的输入值。
        visualEditorDoc.execCommand(command, false, prompt(promptText,
                                                           promptDefault));
      }
      if(command === 'createLink') {
        doPopupCommand(command, 'Enter link URL:', 'http://www.example.com');
      } else if(command === 'insertImage') {
        doPopupCommand(command, 'Enter image URL:', 'http://www.example.com/image.png');
      } else if(command === 'insertMap') {
          if(navigator.geolocation) {//检查用户浏览器是否支持Geolocation
            node.innerHTML = 'Loading';
            navigator.geolocation.getCurrentPosition(function(pos) {//当用户点击富文本编辑器工具栏上的Location Map按钮时,浏览器会请求应用许可其对地理数据的访问。
              var coords = pos.coords.latitude+','+pos.coords.longitude;
              var img = 'http://maps.googleapis.com/maps/api/staticmap?markers='
              +coords+'&zoom=11&size=200x200&sensor=false';
              visualEditorDoc.execCommand('insertImage', false, img); //利用execCommand插入一张包含用户当前位置的静态谷歌地图。
              node.innerHTML = 'Location Map';
            });
          } else {
            alert('Geolocation not available', 'No geolocation data');
          }
        }

          else {
            visualEditorDoc.execCommand(command);
          }
    };
    visualEditorToolbar.addEventListener('click', richTextAction, false);
    // listing 3.9

    //创建持久性文件系统
    window.requestFileSystem =
      window.requestFileSystem
    || window.webkitRequestFileSystem
    || window.mozRequestFileSystem
    || window.msRequestFileSystem
    || false;

    window.storageInfo = navigator.persistentStorage //为了方便起见,将文件系统对象都指向可能的浏览器厂商前缀。如果浏览器厂商不支持这些对象,在它们的值将为false
    || navigator.webkitPersistentStorage 
    || navigator.mozPersistentStorage    
    || navigator.msPersistentStorage     
    || false;

    var stType = window.PERSISTENT || 1,//为应用定义用到的基本变量:存储类型及容量、文件系统对象、文件列表元素,以及当前选择的文件(在编辑时)。
        stSize = (5*1024*1024),
        fileSystem,
        fileListEl = document.getElementById('files'),
        currentFile;
    var fsError = function(e) {//适用于所有File System API方法调用的标准错误函数。
      if(e.code === 9) {
        alert('File name already exists.', 'File System Error');
      } else {
        alert('An unexpected error occured. Error code: '+e.code);
      }
    };
    var qmError = function(e) {//适用于所有Quota Management API方法调用的标准错误函数。
      if(e.code === 22) {
        alert('Quota exceeded.', 'Quota Management Error');
      } else {
        alert('An unexpected error occurred. Error code: '+e.code);
      }
    };
    if(requestFileSystem && storageInfo) {//查看浏览器是否支持FileSystem API与Quota Management API(也被称作StorageInfo)
      var checkQuota = function(currentUsage, quota) {
        if(quota === 0) {
          storageInfo.requestQuota(stSize, getFS, qmError);//因为该应用存在一个持久性文件系统,配额请求将触发一个消息,该消息征求用户的允许,以便访问浏览器文件系统。
        } else {
          getFS(quota);
        }
      };
      storageInfo.queryUsageAndQuota(checkQuota, qmError);//如果queryUsageAndQuota成功执行,则它会把usage和quotainfo一并赋予回调函数checkQuota,否则就会调用qmError。
                                                          //CheckQuota函数用于确定是否有足够的配额来存储文件,如果配额不够,则需要请求一个更大的配额。
      var getFS = function(quota) {
        requestFileSystem(stType, quota, displayFileSystem, fsError);//利用requestFileSystem方法获取文件系统对象。
      }
      var displayFileSystem = function(fs) {
        fileSystem = fs;
        updateBrowserFilesList();//
        if(view === 'editor') {
          loadFile(fileName);
        }
      }
      // listing 3.10 根据文件数组构建文件列表UI
      var displayBrowserFileList = function(files) {
        fileListEl.innerHTML = '';
        document.getElementById('file_count').innerHTML = files.length;//利用文件系统中的文件数目来更新文件计数器。
        if(files.length > 0) {
          files.forEach(function(file, i) { //使用forEach数组函数迭代文件系统中的每个文件。
            var li = '<li id="li_'+i+'" draggable="true">'+file.name
            + '<div><button id="view_'+i+'">View</button>'
            + '<button class="green" id="edit_'+i+'">Edit</button>'
            + '<button class="red" id="del_'+i+'">Delete</button>'
            + '</div></li>';
            fileListEl.insertAdjacentHTML('beforeend', li);
            var listItem = document.getElementById('li_'+i),
                viewBtn = document.getElementById('view_'+i),
                editBtn = document.getElementById('edit_'+i),
                deleteBtn = document.getElementById('del_'+i);
            var doDrag = function(e) { dragFile(file, e); }
            var doView = function() { viewFile(file); }
            var doEdit = function() { editFile(file); }
            var doDelete = function() { deleteFile(file); }
            viewBtn.addEventListener('click', doView, false);//将事件处理器添加到查看、编辑、删除按钮以及每个列表项本身上。
            editBtn.addEventListener('click', doEdit, false);
            deleteBtn.addEventListener('click', doDelete, false);
            listItem.addEventListener('dragstart', doDrag, false);
          });
        } else {
          fileListEl.innerHTML = '<li class="empty">No files to display</li>'; //如果没有文件,则显示一个空列表消息。
        }
      };
      // listing 3.11 使用 directoryReader 读取文件列表

      var updateBrowserFilesList = function() {
        var dirReader = fileSystem.root.createReader(),//创建一个DirectoryReader对象,稍后将用它来获取整个列表的文件。
            files = [];
        var readFileList = function() {//使用循环函数,每次读取目录列表中的一组文件,知道所有文件都被读取完为止。
          dirReader.readEntries(function(fileSet) {
            if(!fileSet.length) {
              displayBrowserFileList(files.sort()); //到到达目录的末尾时,条用displayBrowserFileList函数,将按字母排序的文件数组作为参看传入。
            } else {
              for(var i=0,len=fileSet.length; i<len; i++) {
                files.push(fileSet[i]); //如果还未到达目录末尾,将刚读取的文件推送入文件数组,然后再次循环调用readFileList函数。
              }
              readFileList();
            }
          }, fsError);
        }
        readFileList();
      };
      //  在文件编辑器视图中加载文件
      var loadFile = function(name) { //File System API的file方法用来获取fileEntry的文件,并将文件传入回调函数。
        fileSystem.root.getFile(name, {}, function(fileEntry) {
          currentFile = fileEntry;

          //FileReader对象(文件读取器)用来读取文件内容。当文件读取器读取完毕时,会触发onloadend时机处理器,更新可视化编辑器与HTML编辑器。
          fileEntry.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
              updateVisualEditor(this.result);
            }
            //创建好心的FileReader并且定义了它的onloadend事件后,调用readAdText,读取文件并将文件加载到文件读取的result属性中。
            reader.readAsText(file);
          }, fsError);
        }, fsError);
      };
      // 3.13 查看,编辑,删除文件
      var viewFile = function(file) {
        //利用toURL方法,可轻松实现查看文件内容的功能,只需将文件的URL位置传给一个浏览器窗口,使文件显示出来即可。
        window.open(file.toURL(), 'SuperEditorPreview', 'width=800,height=600');
      };
      //为了编辑该文件,需要先将文件加载到可视化编辑器与HTML编辑器中,然后通过改变URL散列值,激活文件编辑器视图。
      var editFile = function(file) {
        loadFile(file.name);
        location.href = '#editor/'+file.name;
      };
      var deleteFile = function(file) {
        var deleteSuccess = function() {
          alert('File '+file.name+' deleted successfully', 'File deleted');
          updateBrowserFilesList();
        }
        if(confirm('File will be deleted. Are you sure?', 'Confirm delete')) {
          file.remove(deleteSuccess, fsError);
        }
      };

      //3.14创建新的空文件
      var createFile = function(field) {
        //将config对象传入getFile方法,使getFile创建一个FileEntry-- 只有在该名称的FileEntry不存在的情况下,才进行创建。
        var config = {
          create: true,
          exclusive: true
        };

        var createSuccess = function(file) {
          //getFile方法成功返回时,显示确定消息,重新加载并显示文件列表,清楚表单字段。
          alert('File '+file.name+' created successfully', 'File created');
          updateBrowserFilesList();
          field.value = '';
        }
        fileSystem.root.getFile(field.value, config, createSuccess, fsError);
      };
      var createFormSubmit = function(e) {
        e.preventDefault();
        var name = document.forms.create.name;
        if(name.value.length > 0) {
          var len = name.value.length;
          if(name.value.substring(len-5, len) === '.html') {
          } else {
            alert('Only extension .html allowed', 'Create Error');
          }
        } else {
          alert('You must enter a file name', 'Create Error');
        }
      };

      document.forms.create.addEventListener('submit', createFormSubmit, false);

      // 3.15导入用户电脑中已有文件
      var importFiles = function(files) {
        var count = 0, validCount = 0;
        var checkCount = function() { //如果所有文件都检测过了,则显示已导入文件的数量和导入失败文件的数量,然后更新文件列表。
          count++;
          if(count === files.length) {
            var errorCount = count - validCount;
            alert(validCount+' file(s) imported. '+errorCount+
                  ' error(s) encountered.', 'Import complete');  
            updateBrowserFilesList();
          }
        };
        for(var i=0,len=files.length;i<len;i++) {//遍历用户已经选择的文件,尝试在文件系统中创建它们。
          var file = files[i];
          //由于for循环会执行一个使用了file对象f的毁掉函数,而且由于循环的迭代可能会在回调触发前结束,所有利用一个终止语句来保存file对象的状态。
          (function(f) {
            var config = {create: true, exclusive: true};
            if(f.type == 'text/html') {
              fileSystem.root.getFile(f.name, config,
                                      function(theFileEntry) {

                           //getFile会在应用的文件系统中创建一个新的FileEntry,再由createWriter为该FileEntry创建一个FileWriter,然后就可以调用FileWriter的writer方法(以已导入文件f的参数)来复制f。
                                        theFileEntry.createWriter(function(fw) {
                                          fw.write(f);
                                          validCount++;
                                          checkCount();
                                        }, function(e) {
                                          checkCount();
                                        });
                                      }, function(e) {
                                        checkCount();
                                      });
            } else {
              checkCount();
            }
          })(file);
        }
      };
      var importFormSubmit = function(e) {
        e.preventDefault();

        //从文件<input>元素中读取文件。如果已选中了至少一个文件,则调用importFiles函数。
        var files = document.forms.import.files.files;
        if(files.length > 0) {
          importFiles(files);
        } else {
          alert('No file(s) selected', 'Import Error');
        }
      };
      document.forms.import.addEventListener('submit', importFormSubmit, false);

      //3.16 利用file writer api 保存文件
      var saveFile = function(callback) {

        //检测当前显示视图究竟是可视化编辑器视图,还是HTML编辑器视图。
        var currentView = function() {
          if(htmlView.style.display === 'block') {
            return 'html';
          } else {
            return 'editor';
          }
        }
        var content;
        if(currentView() === 'editor') {//获取相应编辑器的内容。
          var x = new XMLSerializer();
          content = x.serializeToString(visualEditorDoc);
        } else {
          content = htmlEditor.value;
        }
        currentFile.createWriter(function(fw) {
          //当文件编辑器(fw)成功地将文件长度归零后,fw触发onwriteend事件处理器。该事件处理器会重新定义fw的onwriteend事件处理器,然后调用write保存该文件。
          fw.onwriteend = function(e) {
            //当fw将文件内容都写入文件后,fw会触发onwriteend的事件处理器。callback指的是传入saveFile函数的回调函数。
            fw.onwriteend = function(e) {
              if(typeof callback === 'function') {
                callback(currentFile);
              } else {
                alert('File saved successfully', 'File saved');
              }
              isDirty = false;
            };
            var blob = new Blob([content], //构建一个基于文件内容的Blob对象,它是编辑器内容的字符串表现形式。
                                {text: 'text/html’, endings:’native'}); //使用endings参数来指定所用行尾标记类型。取值native,则会构建一个Blob构造函数,该函数会使用浏览器底层操作系统的原生行尾标记。
            fw.write(blob);
          };
          fw.onerror = fsError;

          //在利用fw保存数据之前,使用truncate(0)来确保length属性被设置为0。否则,当应用所保存的文件比该文件之前的版本短时,length属性就不会更改。
          //结果就会造成老的文本填补了新的较短文件和之前较长版本之间的空白。
          fw.truncate(0);
        }, fsError);
      };
      var previewFile = function() {
        saveFile(viewFile);//saveFile已被传入一个回调函数viewFile。当saveFile成功地将编辑器内容写入当前文件时,它会被调用。
      };
      var saveBtn = document.getElementById('file_save');
      var previewBtn = document.getElementById('file_preview');
      saveBtn.addEventListener('click', saveFile, false);
      previewBtn.addEventListener('click', previewFile, false);

      //通过将文件拖放到应用中实现文件的导入
      var fileDropZone = document.getElementById('filedrop');//将带有filedropID的元素指定文件的拖放区域。
      var importByDrop = function(e) {
        //当文件被拖放入浏览器窗口时,默认的浏览器行为时离开应用页面,导航至新页面来加载文件,所有这里需要取消这种默认行为。
        //首先,调用stopPropagation来防止drop事件冒泡至fileDropZone的祖先元素;其二,调用preventDefault来停止浏览器调用连接到fileDropZone上的默认事件处理器。
        e.stopPropagation();
        e.preventDefault();

        //如果用户拖动文件,这些文件就会保存在dataTransfer对象中。要想把它们载入应用,就将它们传入importFiles函数。
        var files = e.dataTransfer.files;
        if(files.length > 0) {
          importFiles(files);
        }
      };
      var importDragOver = function(e) {
        e.preventDefault();
        e.dataTransfer.effectAllowed = 'copy';//由于我们想把文件在放入拖放区域时,对其进行复制,所以要设定dragover属性effectAllowed和dropEffect.
                                              //当用户把文件拖放至拖放区域上方时,文件的图标就会变成一个待定的复制操作图标。
        e.dataTransfer.dropEffect = 'copy';
        return false;
      };
      fileDropZone.addEventListener('drop', importByDrop, false);
      fileDropZone.addEventListener('dragover', importDragOver, false);

      //3.18通过将文件拖出应用来导出文件
      var dragFile = function(file, e) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.dropEffect = 'copy';

        //当用户开始在应用中拖动一个可拖动的项目时,dataTransfer对象的setData方法就会被用来定义放置的是何种数据。
        e.dataTransfer.setData('DownloadURL', 'application/octet-stream:'+file.name+':'+file.toURL());
      };


    } else {
      alert('File System API not supported', 'Unsupported');
    }
  };
  var init = function() {
    new SuperEditor();
  }
  window.addEventListener('load', init, false);
})();

