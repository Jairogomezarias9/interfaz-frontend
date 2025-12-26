import re
from playwright.sync_api import sync_playwright
import time
import datetime
import os
import json

def get_logo_url(team_name):
    """
    Returns the URL for the team's logo if it exists locally.
    Otherwise returns the default logo.
    """
    if not team_name:
        return "/logoreal.png"
    
    # Normalize name to match how download_logos.js saves them
    safe_name = re.sub(r'[^a-zA-Z0-9]', '_', team_name).lower() + ".png"
    
    # Check if file exists in public/logos relative to this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    logos_dir = os.path.join(current_dir, '..', 'public', 'logos')
    file_path = os.path.join(logos_dir, safe_name)
    
    if os.path.exists(file_path):
        return f"/logos/{safe_name}"
    
    return "/logoreal.png"

def scrape_tonybet_oriol():
    """
    Scrapes UPCOMING matches (Prematch) from Tonybet using the specific API endpoint provided.
    Collects ALL available markets for each match.
    """
    matches_to_scrape = []
    
    with sync_playwright() as p:
        launch_options = {
            "headless": True,
            "args": [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        }
        
        browser = p.chromium.launch(**launch_options)
        
        # Open page to establish session/cookies
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        
        try:
            print("[ORIOL] Initializing session...")
            # Navigate to generic domain first
            page.goto("https://tonybet.es", timeout=60000)
            
            # The API URL provided by User
            api_url = (
                "https://platform.tonybet.es/api/event/list?"
                "lang=es&relations=odds&relations=withMarketsCount&relations=result&"
                "relations=league&relations=competitors&relations=sportCategories&"
                "relations=tips&relations=additionalInfo&relations=broadcasts&"
                "relations=statistics&oddsExists_eq=1&main=1&period=0&sportId_eq=1&"
                "limit=100&status_in=0&oddsBooster=0&isFavorite=0&isLive=false"
            )
            
            print(f"[ORIOL] Fetching Upcoming Matches from API...")
            
            # Execute fetch in browser context
            json_data = page.evaluate(f"""async () => {{
                try {{
                    const response = await fetch("{api_url}");
                    return await response.json();
                }} catch (e) {{
                    return {{ error: e.toString() }};
                }}
            }}""")
            
            if json_data and isinstance(json_data, dict) and "data" in json_data:
                
                # EXTRACT DATA
                data_root = json_data.get("data", {})
                items = data_root.get("items", [])
                relations = data_root.get("relations", {})
                
                odds_map = relations.get("odds", {})
                leagues_map = relations.get("league", {})
                competitors_map = relations.get("competitors", {})

                # Ensure leagues_map is a dictionary for lookup
                if isinstance(leagues_map, list):
                    lg_list = leagues_map
                    leagues_map = {}
                    for lg in lg_list:
                        lg_id = str(lg.get("id"))
                        leagues_map[lg_id] = lg

                # Ensure competitors_map is a dictionary for lookup
                if isinstance(competitors_map, list):
                    # Convert list to dict keyed by ID
                    # Assuming items in list have 'id' field
                    comp_list = competitors_map
                    competitors_map = {}
                    for c in comp_list:
                        c_id = str(c.get("id"))
                        competitors_map[c_id] = c
                
                print(f"[ORIOL] Found {len(items)} upcoming matches.")
                
                for item in items:
                    try:
                        match_id = str(item.get("id"))
                        
                        # --- TEAMS ---
                        c1_id = item.get("competitor1Id")
                        c2_id = item.get("competitor2Id")
                        
                        home_team = "Unknown Home"
                        away_team = "Unknown Away"

                        # Lookup safely casting to string
                        if c1_id and str(c1_id) in competitors_map:
                            home_team = competitors_map[str(c1_id)].get("name", "Unknown Home")
                        
                        if c2_id and str(c2_id) in competitors_map:
                            away_team = competitors_map[str(c2_id)].get("name", "Unknown Away")

                        # Fallback to item.competitors if still unknown
                        if home_team == "Unknown Home" or away_team == "Unknown Away":
                             item_comps = item.get("competitors", [])
                             if len(item_comps) >= 2:
                                 if home_team == "Unknown Home": 
                                     home_team = item_comps[0].get("name", "Unknown Home")
                                 if away_team == "Unknown Away": 
                                     away_team = item_comps[1].get("name", "Unknown Away")
                        
                        # --- LEAGUE ---
                        league_name = "Unknown League"
                        league_flag = ""
                        
                        # Try multiple approaches
                        if isinstance(item.get("league"), dict):
                            league_name = item["league"].get("name", league_name)
                        
                        if league_name == "Unknown League":
                            league_id = str(item.get("league", "") or item.get("leagueId", ""))
                            if league_id and league_id in leagues_map:
                                l_obj = leagues_map[league_id]
                                league_name = l_obj.get("name", league_name)
                        
                        if league_name == "Unknown League":
                            sport_cats = item.get("sportCategories", [])
                            if sport_cats and len(sport_cats) > 0:
                                for cat in sport_cats:
                                    if cat.get("name"):
                                        league_name = cat.get("name")
                                        break
                        
                        if league_name == "Unknown League":
                            league_name = "Otra Liga"
                        
                        # --- ODDS ---
                        processed_markets = []
                        if match_id in odds_map:
                            raw_markets = odds_map[match_id]
                            for m in raw_markets:
                                outcomes = []
                                outcomes_list = m.get("outcomes", [])
                                if outcomes_list:
                                    for o in outcomes_list:
                                        outcomes.append({
                                            "id": o.get("id"),
                                            "name": o.get("name") or o.get("desc") or str(o.get("type")), # Robust Extract
                                            "odds": o.get("odds"),
                                            "probabilities": o.get("probabilities"),
                                            "type": o.get("type"),
                                            "active": o.get("active"),
                                            "competitor": o.get("competitor")
                                        })
                                
                                processed_markets.append({
                                    "id": m.get("id"),
                                    "vendorMarketId": m.get("vendorMarketId"),
                                    "name": m.get("name"), # Extract Market Name
                                    "specifiers": m.get("specifiers"),
                                    "outcomes": outcomes,
                                    "status": m.get("status")
                                })
                        
                        # --- TIME ---
                        # User requested "time" field specifically (e.g. "2026-01-02 20:00:00")
                        # API usually has 'time' or 'startTime'
                        start_time_iso = item.get("time") or item.get("startTime") or datetime.datetime.now().isoformat()
                        
                        # Construct Match Object
                        match_data = {
                            "id": match_id,
                            "league": league_name,
                            "home_team": home_team,
                            "away_team": away_team,
                            "teams": f"{home_team} vs {away_team}",
                            "url": f"https://tonybet.es/prematch/football/{match_id}", # Constructed URL
                            "start_time": start_time_iso,
                            "current_minute": "Prematch", # It's upcoming
                            "home_score": "0",
                            "away_score": "0",
                            "tournament": {
                                "name": league_name, "id": 0, "urn_id": "0"
                            },
                            "league_header": {
                                "name": league_name,
                                "flag": league_flag or "https://tonybet.es/assets/img/flags/default.svg" 
                            },
                            "competitors": {
                                "home": {"name": home_team, "logo": get_logo_url(home_team), "urn_id": "0"},
                                "away": {"name": away_team, "logo": get_logo_url(away_team), "urn_id": "0"}
                            },
                            "markets": processed_markets # ALL ODDS
                        }
                        
                        matches_to_scrape.append(match_data)
                        
                    except Exception as e:
                        # print(f"Error parsing item {item.get('id')}: {e}")
                        continue
                        
            else:
                print(f"[ORIOL] API response invalid or empty: {json_data.keys() if json_data else 'None'}")
                
        except Exception as e:
            print(f"[ORIOL] Detailed Error: {e}")
        finally:
            browser.close()
            
    return matches_to_scrape

if __name__ == "__main__":
    data = scrape_tonybet_oriol()
    
    # Save to file for inspection
    output_file = "outputs_oriol.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"[ORIOL] Saved output to {output_file}")
