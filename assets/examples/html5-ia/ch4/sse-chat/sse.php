<?php
session_start();
include_once "credentials.php";
include_once "functions.php";
try {
    $dbh = new PDO($db, $user, $pass);
} catch (PDOException $e) {
    print "Error!: " . $e->getMessage() . "<br/>";
    die();
}
header('Content-Type: text/event-stream'); //设置正确的内容类型。
header('Cache-Control: no-cache'); //确保事件流不被缓存

$uid = $_REQUEST["uid"];
setlocale(LC_ALL, 'en_GB');
date_default_timezone_set('Asia/Shanghai');
$lastUpdate = time();
$startedAt = time();
//Note: IRL, should lock this down by IP address too
//PHP的奇怪之处在于会话是单线程。如果在脚本上让它保持开启,就会阻塞也在使用它的页面。
session_write_close();
while (is_logged_on($dbh, $uid)) {//进行循环,直到用户退出。几乎所有的Web服务器配置都把执行时间限制为30~90秒,允许脚本超时,但浏览器会自动重新连接。
    //IRL you'd use the same functions as being used to build the initial page here
    $getChat = $dbh->prepare('SELECT `timestamp`,`handle`, `message` FROM `log` WHERE `timestamp` >= :lastupdate ORDER BY `timestamp`');
    $getChat->execute(array(':lastupdate' => strftime("%Y-%m-%d %H:%M:%S", $lastUpdate) ));
    $rows = $getChat->fetchAll(); //在真实的应用中,你需要调用一些在很多应用文件内所共用的渲染逻辑。
    foreach($rows as $row) {
        echo "event: message\n"; //获取自从上次更新以来添加到数据库的所有聊天消息,为了简化逻辑,现在只考虑消息事件。
        echo "data: <time datetime=\"".$row['timestamp']."\">".strftime("%H:%M",strtotime($row['timestamp']))."</time> <b>".$row['handle']."</b> <span>".$row['message']."</span>\n\n";
        //将数据以HTML的形式发送。当然,也可以用JSON编码对象的形式进行发送。
        ob_flush();
        flush();
    }
    //The client should reconnect when terminated, most servers are configured to limit script execution time to between 30-90 seconds
    if ((time() - $startedAt) > 60) {
        session_start();
        die();
    }
    $lastUpdate = time();
    //MySQL timestamp fields do not store to millisecond accuracy, so we sleep for 2 seconds
    //IRL, don't use timestamps
    sleep(2); //存储你上次更新的事件,并暂停2秒钟。在该例中,这是必要的,因为MySql的时间戳列只精确到最近的秒数。
              //MySql完全可以实现毫秒级的精确程度,但是为避免代码过于复杂,这里不会这么做。
}
?>