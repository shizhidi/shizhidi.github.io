<?php
session_start();
include_once "credentials.php";
//request var handle
try {
    $dbh = new PDO($db, $user, $pass);
    $preparedStatement = $dbh->prepare('INSERT INTO `sessions`(`session_id`, `handle`, `connected`) VALUES (:sid,:handle,NOW())');
    $preparedStatement->execute(array(':sid' => session_id(), ':handle' => $_POST["handle"] )); //在数据库中记录提交的用户句柄以及session_id()
    $rows = $preparedStatement->fetchAll();
    $dbh = null;
} catch (PDOException $e) {
    print "Error!: " . $e->getMessage() . "<br/>";
    die();
}
//redirect to index.php
header("Location: index.php");
?>