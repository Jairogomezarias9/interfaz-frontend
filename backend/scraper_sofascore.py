from playwright.sync_api import sync_playwright
import json
import time
import os
import datetime

# --- Configuration ---
API_BASE = "https://api.sofascore.com/api/v1"
LIVE_EVENTS_URL = f"{API_BASE}/sport/football/events/live"
OUTPUT_FILE = "sofascore_live.json"

def get_event_stats_url(event_id):
    return f"{API_BASE}/event/{event_id}/statistics"

def scrape_sofascore():
    print(f"[{datetime.datetime.now()}] Starting SofaScore Scraper...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a real user agent and viewport to mimic a browser
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        # 1. Visit main page first to get cookies/tokens
        print("visiting sofascore.com to prime cookies...")
        try:
            page.goto("https://www.sofascore.com", timeout=30000)
            time.sleep(3) # Wait for initial load
        except Exception as e:
            print(f"Error loading main page: {e}")

        # 2. Fetch Live Events
        print("Fetching Live Events...")
        try:
            # We use page.request to make API calls within the browser context (sharing cookies)
            response = page.request.get(LIVE_EVENTS_URL)
            if response.status != 200:
                print(f"Failed to fetch live events. Status: {response.status}")
                browser.close()
                return

            data = response.json()
            events = data.get('events', [])
            print(f"Found {len(events)} live events.")

        except Exception as e:
            print(f"Error fetching live events: {e}")
            browser.close()
            return

        # 3. Iterate and Fetch Stats
        results = []
        
        for i, event in enumerate(events):
            event_id = event.get('id')
            home_team = event.get('homeTeam', {}).get('name', 'Unknown')
            away_team = event.get('awayTeam', {}).get('name', 'Unknown')
            tournament = event.get('tournament', {}).get('name', 'Unknown')
            
            print(f"[{i+1}/{len(events)}] Processing: {home_team} vs {away_team} (ID: {event_id})")

            match_data = {
                "id": event_id,
                "homeTeam": home_team,
                "awayTeam": away_team,
                "tournament": tournament,
                "status": event.get('status', {}).get('description', 'Unknown'),
                "score": {
                    "home": event.get('homeScore', {}).get('current', 0),
                    "away": event.get('awayScore', {}).get('current', 0)
                },
                "minute": event.get('status', {}).get('description', ''), # Often in description or a separate field
                "stats": {}
            }

            # Fetch Statistics
            try:
                stats_url = get_event_stats_url(event_id)
                # Add a small delay to be polite and avoid rate limits
                time.sleep(0.5) 
                
                stats_res = page.request.get(stats_url)
                
                if stats_res.status == 200:
                    stats_json = stats_res.json()
                    statistics = stats_json.get('statistics', [])
                    
                    # Parse specific fields
                    parsed_stats = {}
                    
                    # Flatten groups
                    for period in statistics:
                        if period.get('period') == 'ALL':
                            for group in period.get('groups', []):
                                for item in group.get('statisticsItems', []):
                                    key = item.get('key')
                                    name = item.get('name')
                                    home_val = item.get('homeValue')
                                    away_val = item.get('awayValue')
                                    
                                    # Target Metrics
                                    if key in ['ballPossession', 'cornerKicks', 'fouls', 'expectedGoals', 'bigChances', 'shotsOnGoal', 'shotsOffGoal']:
                                         parsed_stats[key] = {
                                             "name": name,
                                             "home": home_val,
                                             "away": away_val
                                         }
                    
                    match_data['stats'] = parsed_stats
                elif stats_res.status == 404:
                     print("   -> No statistics available (404)")
                else:
                    print(f"   -> Failed to fetch stats. Status: {stats_res.status}")

            except Exception as e:
                print(f"   -> Error fetching stats: {e}")

            results.append(match_data)

        # 4. Save to File
        try:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"Successfully saved {len(results)} matches to {OUTPUT_FILE}")
        except Exception as e:
            print(f"Error saving to file: {e}")

        browser.close()

if __name__ == "__main__":
    scrape_sofascore()
