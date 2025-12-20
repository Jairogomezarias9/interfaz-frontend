import json
import os

local_db_path = 'soccer_wiki_logos.json'

try:
    with open(local_db_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    clubs = data.get('ClubData', [])
    print(f"Loaded {len(clubs)} clubs.")
    
    search_terms = ["Hawks", "Banjul", "Gamb"]
    
    for term in search_terms:
        print(f"\n--- Searching for '{term}' ---")
        found = False
        for club in clubs:
            if term.lower() in club.get('Name', '').lower():
                print(f"Found: ID={club.get('ID')} Name='{club.get('Name')}'")
                found = True
        if not found:
            print(f"No match for '{term}'")
            
except Exception as e:
    print(f"Error: {e}")
