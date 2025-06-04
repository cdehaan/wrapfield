<?php
    require_once "CreateDatabaseConnection.php";


    // Start - Clean data from the player creating the board
    $userInput = json_decode(file_get_contents("php://input"));
    $boardInput = $userInput->board;
    $playerInput = $userInput->player;

    $height = 10;
    if(isset($boardInput->height) && is_numeric($boardInput->height)) {
        $height = intval($boardInput->height);
        $height = max(4, $height);
        $height = min(30, $height);
    }

    $width = 10;
    if(isset($boardInput->width) && is_numeric($boardInput->width)) {
        $width = intval($boardInput->width);
        $width = max(4, $width);
        $width = min(30, $width);
    }

    $mines = 15;
    if(isset($boardInput->mines) && is_numeric($boardInput->mines)) {
        $mines = intval($boardInput->mines);
        $mines = max(2, $mines);
        $mines = min($width*$height -1, $mines);
    }

    // 0 and 1 is better for MySQL
    $private = $boardInput->private === true ? 1 : 0;
    $wrapfield = $boardInput->wrapfield === true ? 1 : 0;
    $hint = $boardInput->hint === true ? 1 : 0;

    $playerName = "Anonymous";
    if(isset($playerInput->name) && is_string($playerInput->name)) {
        $playerName = substr(preg_replace('/[^\\p{L} 0-9]/mu', '-', $playerInput->name), 0, 20);
    }

    if(!isset($playerInput->peerId)) { $returnData['error'] = 'No Peer Id found when creating board.'; die(json_encode($returnData)); }
    $peerId = substr(preg_replace("/[^A-Za-z0-9 -]/", '', $playerInput->peerId), 0, 50); //5456de20-0bc4-479e-83dd-9805450fae03
    // End - Clean data from the player creating the board



    // True bools are better for returned data
    $returnData = [];
    $returnData['board']['wrapfield'] = $boardInput->wrapfield === true ? true : false;
    $returnData['board']['hint'] = $boardInput->hint === true ? true : false;

    // Create an empty board
    $boardCells = array_fill(0, $height, array_fill(0, $width, array(owner  => null, state => "s", neighbours => 0)));
    foreach ($boardCells as $rowKey => $row) {
        foreach ($row as $columnKey => $cell) {
            $boardCells[$rowKey][$columnKey]['y'] = $rowKey;
            $boardCells[$rowKey][$columnKey]['x'] = $columnKey;
        }
    }

    // Fill the board with mines
    for($mineCount = 0; $mineCount < $mines; $mineCount++) {
        $randomY = random_int(0, $height-1);
        $randomX = random_int(0, $width-1);
        if($boardCells[$randomY][$randomX]['state'] === "s") {
            $boardCells[$randomY][$randomX]['state'] = "m";
            for($neighboursY = $randomY-1; $neighboursY <= $randomY+1; $neighboursY++) {
                for($neighboursX = $randomX-1; $neighboursX <= $randomX+1; $neighboursX++) {
                    if(!$wrapfield) {
                        if($neighboursY <  0)       { continue; }
                        if($neighboursY >= $height) { continue; }
                        if($neighboursX <  0)       { continue; }
                        if($neighboursX >= $width)  { continue; }
                    }
                    $wrappedY = ($neighboursY % $height + $height) % $height;
                    $wrappedX = ($neighboursX % $width  + $width)  % $width;
                    $boardCells[$wrappedY][$wrappedX]['neighbours']++;
                }
            }
        } else {
            $mineCount--;
        }
    }
    $returnData['board']['cells'] = $boardCells;

    $zeroNeighbours = [];
    foreach ($boardCells as $rowKey => $row) {
        foreach ($row as $columnKey => $cell) {
            if($boardCells[$rowKey][$columnKey]['neighbours'] === 0) {
                $zeroNeighbours[] = $boardCells[$rowKey][$columnKey];
            }
        }
    }

    $safeY = null;
    $safeX = null;
    if(count($zeroNeighbours) > 0) {
        $safeCell = random_int(0, count($zeroNeighbours)-1);
        $safeY = $zeroNeighbours[$safeCell]['y'];
        $safeX = $zeroNeighbours[$safeCell]['x'];
    }
    $returnData['board']['safe'] = array('y' => $safeY, 'x' => $safeX);



    // Create a board code. Uppercase letters
    $uniqueBoardCode = false;
    do {
        $boardCode = "";
        for($codeCount = 0; $codeCount < 6; $codeCount++) {
            $boardCode = $boardCode . chr(65+random_int(0, 25));
        }
        $sql = "SELECT COUNT(*) FROM board WHERE code = '$boardCode';";
        $result = $conn->query($sql);
        $existingBoardCount = intval($result->fetch_row()[0]);
        if($existingBoardCount === 0) { $uniqueBoardCode = true; }    
    } while ($uniqueBoardCode === false);
    $returnData['board']['code'] = $boardCode;



    // Create a secret for private boards. Digits, uppercase, and lower case
    for($secretCount = 0; $secretCount < 12; $secretCount++) {
        $randomInt = random_int(48, 109);
        if($randomInt > 57) { $randomInt = $randomInt + 7; }
        if($randomInt > 90) { $randomInt = $randomInt + 6; }
        $boardSecret = $boardSecret . chr($randomInt);
    }
    $returnData['board']['secret'] = $boardSecret;



    // If the player sent credentials, verify them
    $existingPlayer = false;
    if(isset($playerInput->playerKey) && isset($playerInput->secret)) {
        $playerKey = intval($playerInput->playerKey);
        $playerSecret = substr(preg_replace("/[^A-Za-z0-9]/", '', $playerInput->secret), 0, 20);

        $sql = "SELECT COUNT(*) FROM player WHERE player_key = $playerKey AND secret = '$playerSecret';";
        $result = $conn->query($sql);
        $existingPlayerCount = intval($result->fetch_row()[0]);
        if($existingPlayerCount === 1) { $existingPlayer = true; }
    }



    // Make a new player if needed (first time or credentials didn't verify)
    if ($existingPlayer === false) {
        // Random digits, uppercase, and lower case
        for($secretCount = 0; $secretCount < 12; $secretCount++) {
            $randomInt = random_int(48, 109);
            if($randomInt > 57) { $randomInt = $randomInt + 7; }
            if($randomInt > 90) { $randomInt = $randomInt + 6; }
            $playerSecret = $playerSecret . chr($randomInt);
        }

        $sql = "INSERT INTO player (name, secret, peer_id) VALUES ('$playerName', '$playerSecret', '$peerId');";
        if ($conn->query($sql) === TRUE) { $playerKey = $conn->insert_id; }
        else { $returnData['error'] = 'Error creating new player'; die(json_encode($returnData)); }
    } else {
        $sql = "UPDATE player SET name = '$playerName', peer_id = '$peerId' WHERE player_key = $playerKey;";
        if ($conn->query($sql) !== TRUE) { $returnData['error'] = 'Error updating player data'; die(json_encode($returnData)); }
    }
    $returnData['player']['secret'] = $playerSecret;
    $returnData['player']['playerKey'] = $playerKey;



    // Save the board we made into the database
    $boardCellsString = json_encode($boardCells);
    $sql = "INSERT INTO board (code, secret, private, active, width, height, mines, wrapfield, cells) VALUES ('$boardCode', '$boardSecret', $private, 1, $width, $height, $mines, $wrapfield, '$boardCellsString');";
    if ($conn->query($sql) === TRUE) { $boardKey = $conn->insert_id; }
    else { $returnData['error'] = 'Error creating new board'; die(json_encode($returnData)); }
    $returnData['board']['key'] = $boardKey;
    $returnData['board']['active'] = true;



    // Connect the player to the board we just made
    $sql = "INSERT INTO connection (player_key, board_key) VALUES ($playerKey, $boardKey);";
    if ($conn->query($sql) === TRUE) { $connectionKey = $conn->insert_id; }
    else {$returnData['error'] = 'Error creating new connection'; die(json_encode($returnData)); }
    $returnData['connection']['key'] = $connectionKey;


    // If the player is connected to a previous board, remove that connection
    $sql = "DELETE FROM connection WHERE player_key = $playerKey AND board_key != $boardKey;";
    $result = $conn->query($sql);
    if($result === false) { $returnData['error'] = 'Error deleting previous board connection.'; die(json_encode($returnData)); }



    // If this results in a board with no connected players, delete the board
    $sql = "DELETE FROM board WHERE board_key NOT IN (SELECT board_key FROM connection);";
    $result = $conn->query($sql);
    if($result === false) { $returnData['error'] = 'Error deleting empty board.'; die(json_encode($returnData)); }


    echo json_encode($returnData);
