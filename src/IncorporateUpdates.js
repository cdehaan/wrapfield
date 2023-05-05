  function IncorporateUpdates(cellUpdates, oldBoardData) {
    const newBoardData = {...oldBoardData};
    if(!oldBoardData.start) { newBoardData.start = new Date(); }

    cellUpdates.forEach(cellUpdate => {
        // Missing or malformed data, ignore the update (null is not considered "missing")
        //if(update.state === undefined || !update.owner.every(element => {return typeof element === 'number';}) || update.scored === undefined || !Number.isInteger(update.y) || !Number.isInteger(update.x)) { return; }
        if(cellUpdate.state === undefined || (!Number.isInteger(cellUpdate.owner) && cellUpdate.owner !== null) || cellUpdate.scored === undefined || !Number.isInteger(cellUpdate.y) || !Number.isInteger(cellUpdate.x)) { return null; }

        const currentCell = newBoardData.cells[cellUpdate.y][cellUpdate.x];
        if(!currentCell) { return; }

        const existingState  = currentCell.state;
        const existingOwners = currentCell.owner;
        // const existingScored = currentCell.scored; // Never used

        const updateState  = cellUpdate.state.toString().substring(0,1);
        const updateOwner  = cellUpdate.owner;
        const updateScored = !!cellUpdate.scored;

        const currentOwner = (existingOwners && existingOwners.includes(updateOwner));

        // These states can never interact
        if(['m', 'e', 'f'].includes(existingState) && ['s', 'c', 'd'].includes(updateState)) { return; }
        if(['s', 'c', 'd'].includes(existingState) && ['m', 'e', 'f'].includes(updateState)) { return; }

        switch (updateState) {
            // A safe event is ignored unless removing a dud (which is complex)
            case 's':
            switch (existingState) {
                case 's':
                // No change needed
                break;
                case 'c':
                // No change needed
                break;
                case 'd':
                // Can't remove a dud unless it's owned by the updater
                if(!currentOwner) { return; }

                // Someone else also placed a dud, remove updater ownership from the dud
                if(existingOwners.length > 1) {
                    currentCell.state  = 'd';
                    currentCell.owner  = existingOwners.filter(player => player !== updateOwner);
                    currentCell.scored = true;
                }
                
                // It's updater's dud, remove it and make it safe
                else {
                    currentCell.state  = 's';
                    currentCell.owner  = null;
                    currentCell.scored = false;
                }
                break;
                    
                default:
                console.log("Can't incorporate update:" + cellUpdate);
                break;
            }
            break; // updateState = s


            // A clear event always results in a clear cell, the only question is who owns it
            case 'c':
            currentCell.state  = 'c';
            currentCell.scored = updateScored;

            switch (existingState) {
                case 's':
                currentCell.owner  = [updateOwner];
                break;
                case 'c':
                currentCell.owner  = existingOwners.concat([updateOwner]);
                break;
                case 'd':
                currentCell.owner  = [updateOwner];
                break;              
                default:
                console.log("Can't incorporate update:" + cellUpdate);
                break;
            }
            break; // updateState = c


            // Placing a dud doesn't work on a clear cell
            case 'd':
            switch (existingState) {
                case 's':
                currentCell.state  = 'd';
                currentCell.owner  = [updateOwner];
                currentCell.scored = true;
                break;
                case 'c':
                // No change needed
                break;
                case 'd':
                currentCell.state  = 'd';
                currentCell.owner  = existingOwners.concat([updateOwner]);
                currentCell.scored = true;
                break;
            
                default:
                console.log("Can't incorporate update:" + cellUpdate);
                break;
            }
            break;


            // Placing a mine is ignored, unless removing a flag (which is complex)
            case 'm':
            switch (existingState) {
                case 'm':
                // No change needed
                break;
                case 'e':
                // No change needed
                break;
                case 'f':
                // Can't remove a flag unless it's updater's
                if(!currentOwner) { return; }

                // Someone else also placed a flag, remove updater's ownership from the flag
                if(existingOwners.length > 1) {
                    currentCell.state  = 'f';
                    currentCell.owner  = existingOwners.filter(player => player !== updateOwner);
                    currentCell.scored = true;
                }
                
                // It's updater's flag, remove it and make it a mine
                else {
                    currentCell.state  = 'm';
                    currentCell.owner  = null;
                    currentCell.scored = false;
                }
                break;
                    
                default:
                console.log("Can't incorporate update:" + cellUpdate);
                break;
            }
            break;


            // An exploded event always results in an exploded cell, the only question is who owns it
            case 'e':
            currentCell.state  = 'e';
            currentCell.scored = true;

            switch (existingState) {
                case 'm':
                currentCell.owner  = [updateOwner];
                break;
                case 'e':
                currentCell.owner  = existingOwners.concat([updateOwner]);
                break;
                case 'f':
                currentCell.owner  = [updateOwner];
                break;              
                default:
                console.log("Can't incorporate update:" + cellUpdate);
                break;
            }

            break;


            // Placing a flag doesn't work on an exploded cell
            case 'f':
            switch (existingState) {
                case 'm':
                currentCell.state  = 'f';
                currentCell.owner  = [updateOwner];
                currentCell.scored = true;
                break;
                case 'e':
                // No change needed
                break;
                case 'f':
                currentCell.state  = 'f';
                currentCell.owner  = existingOwners.concat([updateOwner]);
                currentCell.scored = true;
                break;
            
                default:
                console.log("Can't incorporate update:" + cellUpdate);
                break;
            }
            break;
        
            default:
            console.log("Can't incorporate update:" + cellUpdate);
            break;
        }
    });


    const remainingSafe = !newBoardData.cells ? null : newBoardData.cells.reduce((rowsSum, row) => {
    return rowsSum + row.reduce((cellsSum, cell) => {
        return cellsSum + ((cell.state === 's') ? 1 : 0) + ((cell.state === 'd') ? 1 : 0);
    }, 0);
    }, 0);
    
    if(remainingSafe === 0 && !oldBoardData.end) { newBoardData.end = new Date(); }

    return newBoardData;
  }

  export default IncorporateUpdates;