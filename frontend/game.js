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

const grid = document.querySelector("#dungeon-grid");
const currentToolDisplay = document.querySelector("#current-tool");
const validationMessage = document.querySelector("#validation-status");
const toolButtons = document.querySelectorAll("[data-tool]");
const validateButton = document.querySelector("#validate-dungeon-button");
const saveButton = document.querySelector("#save-dungeon-button");
const loadButton = document.querySelector("#load-dungeon-button");

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
    console.log("Tool selected:", toolName);
    // Remember the selected tool
    selectedTool = toolName;

    // Update the status message
    currentToolDisplay.textContent = "Selected tool: " + toolName;

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


async function validateDungeonWithAPI() {
    console.log("API validation function called!");
    try {
        const response = await fetch("http://127.0.0.1:8000/api/validate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                grid: gridData
            })
        });

        const result = await response.json();

        console.log("Backend validation result:", result);

        if(!result.path){
            validationMessage.textContent = result.message || "Dungeon is invalid! No path to the treasure.";
            validationMessage.style.color = "red";
            return;
        }

        if (result.path.length === 0) {
            validationMessage.textContent = result.message || "Dungeon is invalid! No path to the treasure.";
            validationMessage.style.color = "red";
            return;
        }else{
            validationMessage.textContent = result.message || "Dungeon is valid!";
            validationMessage.style.color = "green";
            displayPath(result.path);
        }

        // TODO: Display the result in your game's UI.
    } catch (error) {
        console.error("Could not connect to the backend:", error);
    }
}


/* ========================================
   TILE CREATION
   Create one clickable grid tile
======================================== */

function createTile(tileType, i, j) {
    const tile = document.createElement("button");
    tile.dataset.row = i;
    tile.dataset.col = j;
    tile.classList.add("tile");

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
    console.log("Displaying path:", path);
    // Display the new path
    path.forEach(function(coord) {
        //const [row, col] = coord.split(",").map(Number); //for string coordinates
        const { row, col } = coord; //for array coordinates

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
   DUNGEON SAVE LOAD FUNCTIONS
   save and load dungeon from the backend
======================================== */
async function saveDungeon() {
    const nameInput = document.querySelector("#dungeon-name");
    const status = document.querySelector("#save-status");
    const name = nameInput.value.trim();

    if (!name) {
        status.textContent = "Please enter a dungeon name.";
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/dungeons", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                grid: gridData
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Failed to save dungeon.");
        }

        status.textContent = `Saved "${result.name}" (ID: ${result.id})!`;
    } catch (error) {
        status.textContent = `Save failed: ${error.message}`;
    }
}

async function loadDungeonList() {
    const dungeonList = document.querySelector("#dungeon-list");
    const status = document.querySelector("#load-status");

    try {
        const response = await fetch("http://127.0.0.1:8000/api/dungeons");

        if (!response.ok) {
            throw new Error("Could not retrieve saved dungeons.");
        }

        const dungeons = await response.json();

        // Clear existing options
        dungeonList.innerHTML = `
            <option value="">Select a dungeon...</option>
        `;

        // Add saved dungeons to dropdown
        dungeons.forEach(dungeon => {
            const option = document.createElement("option");

            option.value = dungeon.id;
            option.textContent = dungeon.name;

            dungeonList.appendChild(option);
        });

        status.textContent = `${dungeons.length} dungeon(s) found.`;

    } catch (error) {
        status.textContent = `Failed to load dungeon list: ${error.message}`;
    }
}

async function loadDungeon() {
    const dungeonList = document.querySelector("#dungeon-list");
    const nameInput = document.querySelector("#dungeon-name");
    const status = document.querySelector("#load-status");

    const dungeonId = dungeonList.value;

    if (!dungeonId) {
        status.textContent = "Please select a dungeon first.";
        return;
    }

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/api/dungeons/${dungeonId}`
        );

        const dungeon = await response.json();

        if (!response.ok) {
            throw new Error(dungeon.detail || "Failed to load dungeon.");
        }

        // Check grid dimensions
        if (
            dungeon.grid.length !== ROWS ||
            dungeon.grid.some(row => row.length !== COLS)
        ) {
            throw new Error("Dungeon grid dimensions do not match.");
        }

        // Clear previous path visualization
        clearPath();

        // Restore dungeon grid
        dungeon.grid.forEach((row, rowIndex) => {
            row.forEach((tileType, colIndex) => {
                const tile = document.querySelector(`.tile[data-row="${rowIndex}"][data-col="${colIndex}"]`);
                updateTile(tile, tileType);
            });
        });

        // Restore dungeon name
        nameInput.value = dungeon.name;

        status.textContent = `Loaded "${dungeon.name}" successfully!`;

    } catch (error) {
        status.textContent = `Load failed: ${error.message}`;
    }
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
        console.log("Validate button clicked!");
        //validateDungeon();
        validateDungeonWithAPI();
    });
}

function setupSaveButton() {
    if(saveButton){
        console.log("Save button found and event listener added.");
    }else{
        console.error("Save button not found!");
        return;
    }
    saveButton.addEventListener("click", function() {
        console.log("Save button clicked!");
        saveDungeon();
    });
}

function setupLoadButton() {
    if(loadButton){
        console.log("Load button found and event listener added."); 
    }else{
        console.error("Load button not found!");
        return;
    }
    loadButton.addEventListener("click", function() {
        console.log("Load button clicked!");
        loadDungeon();
    });
}

/* ========================================
   GAME INITIALIZATION
   Start the game
======================================== */

function main() {
    console.log("Game started with grid size:", ROWS, "x", COLS);
    createGrid();
    setupToolbar();
    setupValidateButton();
    setupSaveButton();
    setupLoadButton();
    loadDungeonList();
    selectTool("floor");
}
// Call main function to start the game
main();