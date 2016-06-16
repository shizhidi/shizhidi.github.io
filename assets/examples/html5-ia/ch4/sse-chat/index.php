<?php
session_start(); //启用标准的PHP会话存储
include_once "credentials.php"; //公共变量和函数包含在不同的文件中。
include_once "functions.php";
try {
    $dbh = new PDO($db, $user, $pass); //使用PHP数据对象(PDO)来连接到数据库。
} catch (PDOException $e) {
    print "Error!: " . $e->getMessage() . "<br/>";
    die();
}
?><!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SSE Chat</title>
    <link href="style.css" rel="stylesheet">
    <script src="jquery-1.7.1.min.js"></script>
    <script src="raf-polyfill.js"></script>
    <!-- 便于JavaScript获取PHP会话ID(省去了读取cookie的过程) -->
    <script>var uid='<?php print session_id(); ?>';</script>

<!--  在chat.js中实现SSE所用的客户端-服务器端代码  -->
    <script src="chat.js"></script>
</head>
<body>
<?php
//if session exists, do chat
try {
//    查找数据库中的所有会话,查找其中session_id等于当前session_id()的绘化
    $checkOnline = $dbh->prepare('SELECT * FROM sessions WHERE session_id = :sid');
    $checkOnline->execute(array(':sid' => session_id()));
    $rows = $checkOnline->fetchAll();
} catch (PDOException $e) {
    print "Error!: " . $e->getMessage() . "<br/>";
    die();
}
//如果找到一个合乎条件的会话,则认为该用户已登录。
if (count($rows) > 0) {

?>
<strong>Online now:</strong><ul class="chatusers">
<?php
//输出一个包含当前已登录用户的无序列表(HTML元素)
print_user_list($dbh);
?>
</ul>
<div class="chatwindow">
<ul class="chatlog">
<?php
print_chat_log($dbh); //输出一个包含聊天消息的无序列表。
?>
</ul>
</div>
<!-- chatform有一种预定义行为,使其能在一定程度上脱离JavaScript,在chat.js中重写了这个默认行为 -->
<form id="chat" class="chatform" method="post" action="add-chat.php">
    <label for="message">Share your thoughts:</label>
    <input name="message" id="message" maxlength="512" autofocus>
    <input type="submit" value="Chat">
</form>
<?php
//else, ask for username
} else {
?>
<form id="login" class="chatlogin" method="post" action="add-session.php">
    <label for="handle">Enter your handle:</label>
    <input name="handle" id="handle" maxlength="127" autofocus>
    <input type="submit" value="Join">
</form>
<?php
}
?>
</body>
</html><?php
$dbh = null;
?>