import json
import difflib
import os

STATS_FILE = "365scores_live.json"

def normalize_name(name):
    if not name: return ""
    name = name.lower()
    replacements = [" fc", "fc ", "fk ", " u21", " u20", " u19", "ca ", " cd", "cf ", " sc", " women", " (w)"]
    for r in replacements:
        name = name.replace(r, "")
    return name.strip()

def test_merger():
    # Load Stats
    if not os.path.exists(STATS_FILE):
        print("Stats file not found")
        return

    with open(STATS_FILE, 'r', encoding='utf-8') as f:
        stats_data = json.load(f)
        
    print(f"Loaded {len(stats_data)} stats records from 365Scores.")
    print("Sample 365 Teams:", [s.get('homeTeam') for s in stats_data[:5]])

    # Mock Fast Data (Simulating what Tonybet scraper returns)
    # We take names from the stats file and distort them slightly to test fuzzy match
    fast_mock = [
        {"home_team": "Pulau Pinang FC"}, # Should match Pulau Pinang
        {"home_team": "PDRM FA"},        # Should match PDRM? (Away team matching?) - logic uses Home
        {"home_team": "Rahmatgonj MFS"}, # Case diff
        {"home_team": "Abahani Limited"}, # Extra word
        {"home_team": "Western Sydney W."}, # Shortened
        {"home_team": "Real Madrid"},    # Should match perfectly if present
        {"home_team": "Random Team 123"} # Should fail
    ]
    
    print("\n--- Testing Matches ---")
    for m in fast_mock:
        home_fast = normalize_name(m['home_team'])
        best_score = 0
        best_match = None
        
        for s in stats_data:
            home_365 = normalize_name(s.get('homeTeam', ''))
            ratio = difflib.SequenceMatcher(None, home_fast, home_365).ratio()
            
            if ratio > best_score:
                best_score = ratio
                best_match = s
                
        print(f"Fast: '{m['home_team']}' -> Best 365: '{best_match['homeTeam'] if best_match else 'None'}' (Score: {best_score:.2f})")
        
        if best_score > 0.55:
            print("  [MATCHED]")
        else:
            print("  [FAILED]")

if __name__ == "__main__":
    test_merger()
