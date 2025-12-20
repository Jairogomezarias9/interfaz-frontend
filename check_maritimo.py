
import json

with open('soccer_wiki_logos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

clubs = data.get('ClubData', [])
terms = ["Marítimo", "Maritimo"]

print("--- Searching JSON for Maritimo ---")
for club in clubs:
    name = club.get('Name', '')
    for t in terms:
        if t.lower() in name.lower():
            print(f"Match for '{t}': {name} (ID: {club['ID']})")
