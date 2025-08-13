<?php
    $ipAddress = $_SERVER['REMOTE_ADDR'];
    $dbName = $_ENV['MYSQL_DATABASE'];
    $dbUser = $_ENV['MYSQL_USERNAME'];
    $dbPass = $_ENV['MYSQL_PASSWORD'];
    $dbHost = $_ENV['MYSQL_HOST'] ?? 'localhost';
    $dbPort = $_ENV['MYSQL_PORT'] ?? 3306;

    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
    if ($conn->connect_error) { die("Error: Authentication failed: " . $conn->connect_error); }

    date_default_timezone_set('Asia/Tokyo');
    $sql = "SET time_zone = '+09:00';";
    if ($conn->query($sql) === FALSE) { die("Error: Couldn't set MySQL timezone."); }

    $sql = "SET NAMES utf8mb4;";
    if ($conn->query($sql) === FALSE) { die("Error: Couldn't set names query (utf8mb4)."); }

    $sql = "SET character_set_client = utf8mb4";
    if ($conn->query($sql) === FALSE) { die("Error: Couldn't set character set."); }

    if ($conn->set_charset("utf8mb4") === FALSE) { die("Error: Couldn't directly set charset (utf8mb4)."); }

    unset($mySqlCredentials);
    unset($sql);
