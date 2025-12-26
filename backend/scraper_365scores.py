from playwright.sync_api import sync_playwright
import json
import time
from datetime import datetime

OUTPUT_FILE = "365scores_live.json"

def scrape_365scores():
    print("Starting 365Scores Scraper (Direct API)...")
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 365Scores needs consistent context
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        
        # 1. Fetch Live Map List via API
        # Construct URL with today's date
        today = datetime.now().strftime("%d/%m/%Y")
        
        # API discovered via sniffer
        api_live_list = (
            f"https://webws.365scores.com/web/games/allscores/?"
            f"appTypeId=5&langId=14&timezoneName=Europe/Madrid&userCountryId=2&sports=1"
            f"&startDate={today}&endDate={today}"
            f"&showOdds=true&onlyLiveGames=true&withTop=true"
        )
        
        print(f"Fetching Live List from: {api_live_list}")
        
        live_matches = []
        try:
            res = page.request.get(api_live_list)
            if res.status == 200:
                data = res.json()
                if "games" in data:
                    print(f"Found {len(data['games'])} live games.")
                    live_matches = data["games"]
                else:
                    print("No 'games' key in response.")
            else:
                print(f"Failed to fetch live list: Status {res.status}")
        except Exception as e:
            print(f"Error fetching live list: {e}")
            
        print(f"Processing {len(live_matches)} matches...")
        
        # 2. Fetch Stats for Each Match
        api_stats_base = "https://webws.365scores.com/web/game/stats/?appTypeId=5&langId=14&timezoneName=Europe/Madrid&userCountryId=2"
        
        for g in live_matches:
            mid = g.get('id')
            if not mid: continue
            
            home_comp = g.get('homeCompetitor', {})
            away_comp = g.get('awayCompetitor', {})
            
            home_name = home_comp.get('name', 'Unknown Home')
            away_name = away_comp.get('name', 'Unknown Away')
            home_id = home_comp.get('id')
            away_id = away_comp.get('id')
            
            print(f"  Fetching stats for {home_name} vs {away_name} ({mid})...")
            
            match_data = {
                "id": mid,
                "homeTeam": home_name,
                "awayTeam": away_name,
                "stats": {"home": {}, "away": {}}
            }
            
            try:
                stats_url = f"{api_stats_base}&games={mid}"
                res_stats = page.request.get(stats_url)
                
                if res_stats.status == 200:
                    data = res_stats.json()
                    
                    if "statistics" in data:
                        for item in data["statistics"]:
                            name = item.get("name")
                            val = item.get("value")
                            comp_id = item.get("competitorId")
                            
                            # Determine side
                            side = None
                            if str(comp_id) == str(home_id): side = "home"
                            elif str(comp_id) == str(away_id): side = "away"
                            
                            if side:
                                key = None
                                # Map metrics
                                name_lower = name.lower()
                                
                                key = None
                                # Map metrics (Fuzzy match / Hybrid English-Spanish)
                                if "total remates" in name_lower or "total shots" in name_lower or "remates" == name_lower: key = "total_shots"
                                elif "puerta" in name_lower or "on goal" in name_lower or "on target" in name_lower: key = "shots_on_goal"
                                elif "fuera" in name_lower or "off goal" in name_lower or "off target" in name_lower: key = "shots_off_goal"
                                elif "bloqueados" in name_lower or "blocked" in name_lower: key = "blocked_shots"
                                elif "pases" in name_lower or "passes" in name_lower: key = "passes_completed"
                                elif "amarillas" in name_lower or "yellow" in name_lower: key = "yellow_cards"
                                elif "rojas" in name_lower or "red" in name_lower: key = "red_cards"
                                elif "posesión" in name_lower or "possession" in name_lower: key = "possession"
                                elif "esquina" in name_lower or "corner" in name_lower: key = "corners"
                                
                                if key:
                                    match_data["stats"][side][key] = val
                    else:
                        pass 
                        # print(f"    No stats details available.")
                else:
                    print(f"    Stats fetch failed: {res_stats.status}")
                    
            except Exception as e:
                print(f"    Error finding stats: {e}")
                
            results.append(match_data)
            time.sleep(0.1) # Brief pause
            
        browser.close()
        
    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(results)} matches to {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_365scores()
