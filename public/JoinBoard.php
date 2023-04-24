<?php
    require_once "CreateDatabaseConnection.php";

    $returnData = [];

    // Start - Data from the player joining the board
    $userInput = json_decode(file_get_contents("php://input"));
    $boardInput = $userInput->board;
    $playerInput = $userInput->player;


    // Board code, strip non-alphanumeric, max 12 char, to uppercase
    if(!isset($boardInput->code)) { $returnData['error'] = 'No game code given.'; die(json_encode($returnData)); }
    $code = strtoupper(substr(preg_replace("/[^A-Za-z0-9]/", '', $boardInput->code), 0, 11));


    // Verify board exists in database
    $sql = "SELECT board_key FROM board WHERE code = '$code';";
    $result = $conn->query($sql);
    if($result->num_rows === 0) { $returnData['error'] = 'Game code board does not exist.'; die(json_encode($returnData)); }
    $boardKey = intval($result->fetch_row()[0]); 


    // Player name, strip non-alphanumeric (any language), max 20 char
    $playerName = "Anonymous";
    if(isset($playerInput->name) && is_string($playerInput->name)) {
        $playerName = substr(preg_replace('/[^\\p{L} 0-9]/mu', '-', $playerInput->name), 0, 19);
    }


    // Player peer ID, other players will use this to connect to the game creator
    if(!isset($playerInput->peerId)) { $returnData['error'] = 'No Peer Id found when joining board.'; die(json_encode($returnData)); }
    $peerId = substr(preg_replace("/[^A-Za-z0-9 -]/", '', $playerInput->peerId), 0, 50); //5456de20-0bc4-479e-83dd-9805450fae03


    // If the player sent credentials, verify them
    $existingPlayer = false;
    if(isset($playerInput->playerKey) && isset($playerInput->playerSecret)) {
        $playerKey = intval($playerInput->playerKey);
        $playerSecret = substr(preg_replace("/[^A-Za-z0-9]/", '', $playerInput->playerSecret), 0, 20);

        $sql = "SELECT COUNT(*) FROM player WHERE player_key = $playerKey AND secret = '$playerSecret';";
        $result = $conn->query($sql);
        $existingPlayerCount = intval($result->fetch_row()[0]);
        if($existingPlayerCount === 1) { $existingPlayer = true; }
    }    
    // End - Data from the player joining the board




    // Make a new player if needed (first time or credentials didn't verify), or update peer id
    if ($existingPlayer === false) {

        // Random digits, uppercase, and lower case
        $playerSecret = "";
        for($secretCount = 0; $secretCount < 12; $secretCount++) {
            $randomInt = random_int(48, 109);
            if($randomInt > 57) { $randomInt = $randomInt + 7; }
            if($randomInt > 90) { $randomInt = $randomInt + 6; }
            $playerSecret = $playerSecret . chr($randomInt);
        }

        $sql = "INSERT INTO player (name, secret, peer_id) VALUES ('$playerName', '$playerSecret', '$peerId');";
        if ($conn->query($sql) === TRUE) { $playerKey = $conn->insert_id; }
        else { $returnData['error'] = 'Error creating new player.'; die(json_encode($returnData)); }
    } else {
        $sql = "UPDATE player SET name = '$playerName', peer_id = '$peerId' WHERE player_key = $playerKey;";
        if ($conn->query($sql) !== TRUE) { $returnData['error'] = 'Error updating player data.'; die(json_encode($returnData)); }
    }
    $returnData['player']['secret'] = $playerSecret;
    $returnData['player']['playerKey'] = intval($playerKey);
    
    // If the player is connected to a previous board, remove that connection
    $sql = "DELETE FROM connection WHERE player_key = $playerKey AND board_key != $boardKey;";
    $result = $conn->query($sql);
    if($result === false) { $returnData['error'] = 'Error deleting previous board connection.'; die(json_encode($returnData)); }


    // If this results in a board with no connected players, delete the board
    $sql = "DELETE FROM board WHERE board_key NOT IN (SELECT board_key FROM connection);";
    $result = $conn->query($sql);
    if($result === false) { $returnData['error'] = 'Error deleting empty board.'; die(json_encode($returnData)); }


    // Query if player is already connected to the board they asked to join. Can only be true for existing players.
    $existingConnection = false;
    if($existingPlayer === true) {
        $sql = "SELECT COUNT(*) FROM connection WHERE player_key = $playerKey AND board_key = $boardKey;";
        $result = $conn->query($sql);
        $existingConnectionCount = intval($result->fetch_row()[0]);
        if($existingConnectionCount === 1) { $existingConnection = true; }    
    }

    // Connect the player to the board they asked to join, if needed
    if($existingConnection === false) {
        $sql = "INSERT INTO connection (player_key, board_key) VALUES ($playerKey, $boardKey);";
        if ($conn->query($sql) === TRUE) { $connectionKey = $conn->insert_id; }
        else { $returnData['error'] = 'Error creating new player/board connection.'; die(json_encode($returnData)); }
    }


    // Pull board information
    $sql = "SELECT board_key AS boardKey, code, private, active, cells, wrapfield FROM board WHERE board_key = $boardKey;";
    $result = $conn->query($sql);
    if($result->num_rows === 0) { $returnData['error'] = 'No game found to join.'; die(json_encode($returnData)); }
    $currentBoard = $result->fetch_array(MYSQLI_ASSOC);
    $returnData['board'] = $currentBoard;


    // Pull board players
    $sql = "SELECT player_key AS playerKey, name, peer_id AS peerId, active FROM player WHERE player_key IN (SELECT player_key FROM connection WHERE board_key = $boardKey);";
    $result = $conn->query($sql);
    if($result->num_rows === 0) { $returnData['error'] = 'No players found in game joined.'; die(json_encode($returnData)); }
    $currentPlayers = $result->fetch_all(MYSQLI_ASSOC);
    foreach ($currentPlayers as &$player) {
        $player['playerKey'] = intval($player['playerKey']);
        $player['active'] = $player['active'] === '1' ? true : false;
    }

    $returnData['players'] = $currentPlayers;


    echo json_encode($returnData);
