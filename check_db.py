import database

conn = database.get_connection()

tables = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()

print([row["name"] for row in tables])

conn.close()
