
player = {
    "name": "Hero",
    "hp": 100,
    "gold": 10
}

enemy = {
    "name": "Slime",
    "hp": 30
}

damage = 15
enemy["hp"] -= damage

print("Welcome to Dungeon Quest!")
print(f"Player: {player['name']}")
print(f"Player HP: {player['hp']}")
print(f"Enemy HP after attack: {enemy['hp']}")
print(f"Gold: {player['gold']}")
