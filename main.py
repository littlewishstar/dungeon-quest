from fastapi import FastAPI
from collections import deque
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from database import *
from typing import Any
import json

app = FastAPI(title="Dungeon Architect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db();

class DungeonSaveRequest(BaseModel):
    name: str
    grid: list[list[str]]

class DungeonRequest(BaseModel):
    grid: list[list[str]]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Dungeon Architect backend is running!"}

@app.get("/api/info")
def get_game_info():
    return {
        "name": "Dungeon Architect",
        "rows": 8,
        "cols": 12
    }

@app.post("/api/validate")
def validate_dungeon(request: DungeonRequest):
    grid = request.grid

    # 1. Check that the grid is rectangular and not empty.
    if not grid or not grid[0]:
        return {"valid": False, "message": "Dungeon grid is empty."}

    rows = len(grid)
    cols = len(grid[0])

    if any(len(row) != cols for row in grid):
        return {"valid": False, "message": "Grid rows must have equal lengths."}

    # 2. Reject unknown tile types.
    allowed_tiles = {"floor", "wall", "player", "treasure"}

    if any(tile not in allowed_tiles for row in grid for tile in row):
        return {"valid": False, "message": "Grid contains an unknown tile type."}

    # 3. Find the player and treasure.
    players = [
        (r, c)
        for r in range(rows)
        for c in range(cols)
        if grid[r][c] == "player"
    ]

    treasures = [
        (r, c)
        for r in range(rows)
        for c in range(cols)
        if grid[r][c] == "treasure"
    ]

    if len(players) != 1:
        return {"valid": False, "message": "Dungeon must have exactly one player."}

    if len(treasures) != 1:
        return {"valid": False, "message": "Dungeon must have exactly one treasure."}

    start = players[0]
    goal = treasures[0]

    # 4. Search for a path using Breadth-First Search (BFS).
    queue = deque([start])
    previous = {start: None}

    directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]

    while queue:
        r, c = queue.popleft()

        if (r, c) == goal:
            break

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            neighbor = (nr, nc)

            if not (0 <= nr < rows and 0 <= nc < cols):
                continue

            if grid[nr][nc] == "wall":
                continue

            if neighbor in previous:
                continue

            previous[neighbor] = (r, c)
            queue.append(neighbor)

    # 5. If BFS never reached the treasure, the dungeon is invalid.
    if goal not in previous:
        return {
            "valid": False,
            "message": "No path exists from player to treasure.",
            "path": []
        }

    # 6. Reconstruct the shortest path by walking backwards.
    path = []
    current = goal

    while current is not None:
        r, c = current
        path.append({"row": r, "col": c})
        current = previous[current]

    path.reverse()

    return {
        "valid": True,
        "message": "Treasure is reachable!",
        "path": path,
        "path_length": len(path) - 1
    }

@app.post("/api/dungeons")
def save_dungeon(request: DungeonSaveRequest):
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            INSERT INTO dungeons (name, grid_json)
            VALUES (?, ?)
            """,
            (request.name, json.dumps(request.grid))
        )

        connection.commit()

        return {
            "message": "Dungeon saved successfully!",
            "id": cursor.lastrowid,
            "name": request.name
        }
    finally:
        connection.close()

@app.get("/api/dungeons")
def list_dungeons():
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT id, name, created_at, updated_at
            FROM dungeons
            ORDER BY id DESC
            """
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        connection.close()

@app.get("/api/dungeons/{dungeon_id}")
def get_dungeon(dungeon_id: int):
    connection = get_connection()

    try:
        row = connection.execute(
            """
            SELECT id, name, grid_json, created_at, updated_at
            FROM dungeons
            WHERE id = ?
            """,
            (dungeon_id,)
        ).fetchone()

        if row is None:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail="Dungeon not found"
            )

        dungeon = dict(row)
        dungeon["grid"] = json.loads(dungeon.pop("grid_json"))

        return dungeon
    finally:
        connection.close()