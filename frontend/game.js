/* ========================================
   GAME CONFIGURATION
   Change dungeon dimensions here
======================================== */

const ROWS = 8;
const COLS = 12;

const gridData = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => "floor")
);
// const path = [];


/* ========================================
   HTML ELEMENTS
   Connect JavaScript to the page
======================================== */

const grid = document.querySelector("#grid");
const status = document.querySelector("#status");
const validationMessage = document.querySelector("#validation-message");
const toolButtons = document.querySelectorAll("[data-tool]");
const validateButton = document.querySelector("#validate");


/* ========================================
   TOOL CONFIGURATION
   Define how each tool looks
======================================== */

const tools = {
    floor: {
        className: "",
        symbol: ""
    },

    wall: {
        className: "wall",
        symbol: ""
    },

    player: {
        className: "player",
        symbol: "🧙"
    },

    treasure: {
        className: "treasure",
        symbol: "💎"
    },

    path: {
        className: "path",
        symbol: "X"
    }
};


/* ========================================
   GAME STATE
   Store the current selection
======================================== */

let selectedTool = "floor";


/* ========================================
   BUTTON HANDLERS
   Connect each button to its action
======================================== */

function selectTool(toolName) {

    // Remember the selected tool
    selectedTool = toolName;

    // Update the status message
    status.textContent = "Selected tool: " + toolName;

    // Highlight the selected button
    toolButtons.forEach(function(button) {
        button.classList.toggle(
            "active",
            button.dataset.tool === toolName
        );
    });
}


function validateDungeon() {
    const playerCount = gridData.flat()
        .filter(tile => tile === "player").length;

    const treasureCount = gridData.flat()
        .filter(tile => tile === "treasure").length;

    // 1. Check that exactly one player exists
    if (playerCount !== 1) {
        validationMessage.textContent =
            "There must be exactly one player tile.";
        validationMessage.style.color = "red";
        return;
    }

    // 2. Check that exactly one treasure exists
    if (treasureCount !== 1) {
        validationMessage.textContent =
            "There must be exactly one treasure tile.";
        validationMessage.style.color = "red";
        return;
    }

    const playerTile = document.querySelector(".tile.player");
    const treasureTile = document.querySelector(".tile.treasure");

    // 3. Check that both tiles exist in the HTML
    if (!playerTile || !treasureTile) {
        validationMessage.textContent =
            "Player and treasure tiles must be placed.";
        validationMessage.style.color = "red";
        return;
    }

    const playerRow = Number(playerTile.dataset.row);
    const playerCol = Number(playerTile.dataset.col);
    const treasureRow = Number(treasureTile.dataset.row);
    const treasureCol = Number(treasureTile.dataset.col);

    const neighbors = [
        [-1, 0], // Up
        [1, 0],  // Down
        [0, -1], // Left
        [0, 1]   // Right
    ];

    // 4. Check whether each tile has at least one
    // walkable neighboring tile
    const playerHasNeighbor = neighbors.some(([dRow, dCol]) =>
        availableTile(playerRow + dRow, playerCol + dCol)
    );

    const treasureHasNeighbor = neighbors.some(([dRow, dCol]) =>
        availableTile(treasureRow + dRow, treasureCol + dCol)
    );

    if (!playerHasNeighbor || !treasureHasNeighbor) {
        validationMessage.textContent =
            "Player and treasure must each have at least one walkable neighbor.";
        validationMessage.style.color = "red";
        return;
    }

    // 5. Find a path between the player and treasure
    clearPath();

    const path = findShortestPath(
        playerRow, playerCol,
        treasureRow, treasureCol
    );

    if (path.length === 0) {
        validationMessage.textContent =
            "Dungeon is invalid! No path to the treasure.";
        validationMessage.style.color = "red";
        return;
    }

    // 6. The dungeon passed all checks
    validationMessage.textContent = "Dungeon is valid!";
    validationMessage.style.color = "green";

    console.log("Shortest path from player to treasure:", path);
    displayPath(path);
}



/* ========================================
   TILE CREATION
   Create one clickable grid tile
======================================== */

function createTile(tileType, i, j) {
    const tile = document.createElement("button");
    tile.dataset.row = i;
    tile.dataset.col = j;

    updateTile(tile, tileType);

    // Handle clicks on this tile
    tile.addEventListener("click", function() {
        tileClickHandler(tile);
    });

    return tile;
}

function updateTileAppearance(tile, toolName) {
    const selected = tools[toolName];

    // Apply the selected tool's appearance
    if (selected.className === "") {
        tile.className = "tile";
    } else {
        tile.className = "tile " + selected.className;
    }

    // Display the selected tool's symbol
    tile.textContent = selected.symbol;

    // Update accessibility information
    tile.setAttribute(
        "aria-label",
        toolName + " tile"
    );
}

function updateTile(tile, toolName) {
    if(!tile){
        console.error("Tile is undefined or null");
        return;
    }

    // Clear the old path before modifying the dungeon
    clearPath();
    
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    // Update the game data
    gridData[row][col] = toolName;

    // Update its appearance
    updateTileAppearance(tile, toolName);
}

function tileClickHandler(tile) {
    if (selectedTool === "player") {
        document.querySelectorAll(".tile.player").forEach(function(playerTile) {
            updateTile(playerTile, "floor");
        });
    }

    if (selectedTool === "treasure") {
        document.querySelectorAll(".tile.treasure").forEach(function(treasureTile) {
            updateTile(treasureTile, "floor");
        });
    }

    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);

    // Update the tile's type in the grid data
    updateTile(tile, selectedTool);

    console.log(
        "Tile %d %d data updated to %s ",
        row,
        col,
        gridData[row][col]
    );
}


/* ========================================
   GRID CREATION
   Build the dungeon from ROWS and COLS
======================================== */

function createGrid() {
    // Set the number of columns dynamically
    grid.style.gridTemplateColumns =
        "repeat(" + COLS + ", minmax(0, 1fr))";

    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            const tile = createTile(gridData[i][j], i, j);
            grid.appendChild(tile);
        }
    }
}


/* ========================================
   GAME INITIALIZATION
   Start the game
======================================== */

function main() {
    createGrid();
    setupToolbar();
    setupValidateButton();
    selectTool("floor");
}


/* ========================================
   PATH FINDING
   Path Finding algorithm to find the shortest path from any two tiles in the grid.

   The algorithm uses a breadth-first search approach to explore the grid
   and find the shortest path between the start and end tiles.

   The path is returned as an array of tile coordinates,
   which can be used to visualize the path on the grid.
======================================== */

function findShortestPath(startRow, startCol, endRow, endCol) {
    const queue = [[startRow, startCol]];
    const visited = new Set([`${startRow},${startCol}`]);
    const parentMap = new Map();
    const path = [];

    while (queue.length > 0) {
        const [currentRow, currentCol] = queue.shift();

        if (currentRow === endRow && currentCol === endCol) {
            let current = `${endRow},${endCol}`;

            while (current) {
                path.unshift(current);
                current = parentMap.get(current);
            }

            return path;
        }

        // Explore neighboring tiles
        const neighbors = [
            [currentRow - 1, currentCol],
            [currentRow + 1, currentCol],
            [currentRow, currentCol - 1],
            [currentRow, currentCol + 1]
        ];

        for (const [neighborRow, neighborCol] of neighbors) {
            const key = `${neighborRow},${neighborCol}`;

            if (!visited.has(key) && availableTile(neighborRow, neighborCol)) {
                visited.add(key);
                parentMap.set(key, `${currentRow},${currentCol}`);
                queue.push([neighborRow, neighborCol]);
            }
        }
    }

    if (path.length === 0) {
        validationMessage.textContent = "No path to the treasure!";
        validationMessage.style.color = "red";
    return;
}

    return []; // No path found
}

function availableTile(row, col) {
    // Check if the tile is within the grid boundaries
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
        return false;
    }

    // Check if the tile is a wall
    if (gridData[row][col] === "wall") {
        return false;
    }

    return true;
}

function displayPath(path) {
    // Display the new path
    path.forEach(function(coord) {
        const [row, col] = coord.split(",").map(Number);

        const pathTile = document.querySelector(
            `.tile[data-row="${row}"][data-col="${col}"]`
        );

        if (pathTile) {
            if (
                !pathTile.classList.contains("player") &&
                !pathTile.classList.contains("treasure")
            ) {
                pathTile.classList.add("path");
            }
        }
    });
}

function clearPath() {
    // Clear the previous path
    document.querySelectorAll(".tile.path").forEach(function(pathTile) {
        pathTile.classList.remove("path");
    });
}


/* ========================================
   BUTTON INITIALIZATION
   Connect each button to its action
======================================== */

function setupToolbar() {
    toolButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const toolName = button.dataset.tool;
            selectTool(toolName);
        });
    });
}

function setupValidateButton() {
    validateButton.addEventListener("click", function() {
        validateDungeon();
    });
}


// Call main function to start the game
main();