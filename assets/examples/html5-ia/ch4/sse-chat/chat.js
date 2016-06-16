$(document).ready(
    function() {
        var chatlog = $('.chatlog');
        if (chatlog.length > 0) {

            //通过链接服务器端上提供事件流的脚本,声明了一个ventSource对象。uid是一个通过主页传入的值,在于服务器端将用户与他们的PHP会话链接起来。
            var evtSource = new EventSource("sse.php?uid=" + uid);
            evtSource.addEventListener("message", function(e) {//使用一般的DOM方法,事件侦听器被添加到EventSource对象上。
                console.log('message');
                var el = document.createElement("li");
                el.innerHTML = e.data;
                chatlog.append(el);
            });
            //服务器端脚本决定了将被调用的事件。message和useradded都不是一般的DOM事件,而是由服务器端脚本所定义的。
            evtSource.addEventListener("useradded", function(e) {
                console.log('useradded');
                var el = document.createElement("li");
                el.innerHTML = e.data;
                chatusers.appendChild(el);
            });
            evtSource.addEventListener("ping", function(e) {
                var newElement = document.createElement("li");
                
                var obj = JSON.parse(e.data);
                newElement.innerHTML = "ping at " + obj.time;
                eventList.appendChild(newElement);
            }, false);
            console.log(evtSource);
            var chatformCallback = function() { //当消息成功传送到服务器上时,清除聊天输入。
                chatform.find('input')[0].value = '';
            };
            var chatform = $('#chat');
            chatform.bind('submit', function() {
                var ajax_params = {
                    url: 'add-chat.php',
                    type: 'POST',
                    data: chatform.serialize(),
                    success: chatformCallback,
                    error: function () { window.alert('An error occurred'); }
                };
                //将一些会话信息一起传送给数据库
                $.ajax(ajax_params);
                return false; //由于该表单用ajax来提交,所以无需重新载入页面。
            })
        }

        function getWords(letters) {
            var msg = {};
            msg.type = 'getWordList';
            msg.params = {};
            msg.params.letters = letter;
            parent.postMessage(JSON.stringify(msg), 'http://localhost');
        }

        window.addEventListener('message', receiver, false);
        function receiver(e) {
            if (e.origin == 'http://localhost:8080') {
                var msg = JSON.parse(e.data);
                switch (msg.type) {
                    case 'sendWordList':
                        showAutocompleter(msg.params.words);
                        break;
                }
            }
        }
    }
);