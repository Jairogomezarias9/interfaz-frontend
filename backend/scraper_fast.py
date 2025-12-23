import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
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

def scrape_tonybet_fast():
    matches_to_scrape = []
    scraped_ids = set()
    
    # Store intercepted odds data: match_id -> list of markets
    odds_cache = {} 

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
        
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        
        # Network Interceptor for API
        def handle_response(response):
            try:
                # Try to parse EVERYTHING as JSON to find the odds
                # print(f"DEBUG: Checking {response.url}")
                try:
                    data = response.json()
                    # Check if this looks like the odds response
                    is_odds = False
                    if isinstance(data, dict):
                        # Pattern 1: relations.odds
                        if "relations" in data and "odds" in data["relations"]:
                            is_odds = True
                        # Pattern 2: events list
                        elif "events" in data and len(data["events"]) > 0:
                             # Check if first event has odds
                             if "markets" in data["events"][0]:
                                 is_odds = True
                    
                    if is_odds:
                        print(f"DEBUG: !!! FOUND ODDS JSON !!! URL: {response.url}")
                        if "relations" in data:
                             for m_id, markets in data["relations"]["odds"].items():
                                 odds_cache[str(m_id)] = markets
                        elif "events" in data:
                             # Different structure handling?
                             pass
                    
                    # Log if it's a large match list even if not recognized
                    if "event" in response.url and not is_odds:
                        print(f"DEBUG: Json response from {response.url} (Keys: {list(data.keys()) if isinstance(data, dict) else 'List'})")

                except:
                    pass
            except Exception as e:
                pass

        page.on("response", handle_response)
        
        try:
            print("Navigating to Tonybet Live Football (CL)...")
            # User confirmed URL
            page.goto("https://tonybet.com/cl/live/football", timeout=60000)
            
            # Get the actual base URL
            current_url = page.url
            print(f"Current URL: {current_url}")
            
            # Extract origin for full_url construction
            from urllib.parse import urlparse
            parsed_uri = urlparse(current_url)
            base_origin = '{uri.scheme}://{uri.netloc}'.format(uri=parsed_uri)
            
            # Wait for data to load
            try:
                # print("DEBUG: Waiting for selector...")
                page.wait_for_selector('div[data-test="teamSeoTitles"]', timeout=30000)
                # Wait a bit more for JSON to arrive
                time.sleep(5) 
            except:
                print(f"Warning: Timeout waiting for teamSeoTitles. Page Title: {page.title()}")
                # print(f"DEBUG: Page Content Source (First 500 chars): {page.content()[:500]}")
            
            print(f"DEBUG: Odds Cache Size (Passive): {len(odds_cache)}")
            
            # --- ACTIVE FETCH FALLBACK ---
            # If passive capture failed, force a fetch from the browser context
            if len(odds_cache) == 0:
                print("DEBUG: Passive capture empty. Attempting ACTIVE FETCH of API...")
                try:
                    # Construct API URL (based on sniffer logs)
                    # We use the valid domain found from current_url or defaults
                    api_host = "https://platform.tonybet.com"
                    
                    # Try to match the domain exactly
                    if "tonybet.cl" in current_url:
                        api_host = "https://platform.tonybet.com" # Sticking to .com as .cl might redirect
                        # But we MUST send countryCode=CL
                    
                    # Fallback to what we saw in logs
                    # Log said: https://platform.tonybet.cl/api/event/list?... (Wait, snippet said platform.tonybet.es in one, .com in others)
                    # The successful log showed:
                    # lang=es&relations=odds&relations=withMarketsCount&relations=result&relations=league&relations=competitors&relations=sportCategories&relations=tips&relations=additionalInfo&relations=broadcasts&relations=statistics&oddsExists_eq=1&main=1&sportId_eq=1&limit=150&status_in=2&status_in=1&oddsBooster=0&isFavorite=0&isLive=true
                    
                    params = (
                        "lang=es&relations=odds&relations=withMarketsCount&relations=result&relations=competitors&relations=league"
                        "&oddsExists_eq=1&main=1&sportId_eq=1&limit=150&status_in=2&status_in=1&isLive=true"
                    )
                    
                    if "cl" in current_url:
                         params += "&countryCode=CL"
                    
                    api_url = f"{api_host}/api/event/list?{params}"
                    
                    print(f"DEBUG: Executing fetch to {api_url}")
                    
                    # Execute fetch in browser
                    json_data = page.evaluate(f"""async () => {{
                        try {{
                            const response = await fetch("{api_url}");
                            return await response.json();
                        }} catch (e) {{
                            return {{ error: e.toString() }};
                        }}
                    }}""")
                    
                    if json_data:
                        # Handle Wrapped Response (common in Tonybet API: {status, data: {...}})
                        payload = json_data
                        if "data" in json_data and isinstance(json_data["data"], dict):
                            print("DEBUG: Unwrapping 'data' key from API response...")
                            payload = json_data["data"]
                        
                        # PARSE ODDS
                        if "relations" in payload and "odds" in payload["relations"]:
                            odds_map = payload["relations"]["odds"]
                            print(f"DEBUG: Found {len(odds_map)} odds markets.")
                            for m_id, markets in odds_map.items():
                                odds_cache[str(m_id)] = markets
                        
                        # DEBUG KEYS
                        print(f"DEBUG: Payload Keys: {list(payload.keys())}")

                        # DISABLED: API-based match parsing (unreliable for time/score data)
                        # We now only use HTML parsing for match data and API for odds only
                        # 
                        # Reason: API fields like clock.matchTime are often None or inconsistent
                        # HTML parsing is more reliable for: time, score, team names
                        # API is kept only for: odds extraction (works well)
                        
                        print(f"DEBUG: API fetched successfully. Using HTML parsing for match data, API for odds only.")
                        
                    else:
                        print("DEBUG: Active fetch returned empty/null")
                        
                except Exception as e:
                    print(f"DEBUG: Active Fetch Failed: {e}")

            print("Starting scrolling loop...")
            
            # SCROLLING PHASE - REDESIGNED
            # Often sites behave better if you scroll to the specific list container
            for i in range(7): # Increase iterations
                # Scroll to bottom
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1)
                
                # Scroll a bit up and down to trigger intersection observers
                page.evaluate("window.scrollBy(0, -500)")
                time.sleep(0.5)
                page.evaluate("window.scrollBy(0, 500)")
                
                # Report
                count = page.locator('div[data-test="teamSeoTitles"]').count()
                print(f"Scroll {i+1}: Found {count} matches")
                time.sleep(2)

            print("Starting parsing...")

            content = page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            team_titles_containers = soup.find_all('div', attrs={'data-test': 'teamSeoTitles'})
            
            for team_titles_container in team_titles_containers:
                try:
                    event_table_row = team_titles_container.find_parent('div', attrs={'data-test': 'eventTableRow'})
                    if not event_table_row: continue
                        
                    link_el = event_table_row.find('a', attrs={'data-test': 'eventLink'})
                    if not link_el: continue
                        
                    href = link_el.get('href')
                    if 'football' not in href and 'soccer' not in href: continue
                    
                    # Extract Match ID from HREF for JSON lookup FIRST (before duplicate check)
                    # URL samples: /live/football/1008007-laliga/7802786-osasuna-alaves
                    parts = href.split('/')
                    # Sometimes structure varies. Grab the last part that starts with a number?
                    raw_id_part = parts[-1]
                    match_db_id = raw_id_part.split('-')[0]
                    
                    # Verify ID extraction
                    if not match_db_id.isdigit():
                         # Try finding it in other parts
                         match_id_match = re.search(r'/(\\d+)-', href)
                         if match_id_match:
                             match_db_id = match_id_match.group(1)
                    
                    # NOW check for duplicates using the actual match ID
                    if match_db_id in scraped_ids: 
                        continue
                    
                    # Dynamic base URL
                    full_url = f"{base_origin}{href}"
                    
                    # print(f"DEBUG: Processing {home_team} vs {away_team} (ID: {match_db_id})")
                    
                    # --- HTML Extraction (Teams, Score, Time) ---
                    # (Keep existing robust logic)
                    home_team = "Unknown Home"
                    away_team = "Unknown Away"
                    team_name_divs = team_titles_container.find_all('div', attrs={'data-test': 'teamName'})
                    if len(team_name_divs) >= 2:
                        home_team = team_name_divs[0].get_text(strip=True)
                        away_team = team_name_divs[1].get_text(strip=True)
                    else:
                        continue
                        
                    home_team = re.sub(r'\d+$', '', home_team).strip()
                    away_team = re.sub(r'\d+$', '', away_team).strip()

                    home_score = "0"; away_score = "0"
                    try:
                        score_divs = team_titles_container.find_all('div', attrs={'data-test': 'teamScore'})
                        if len(score_divs) >= 2:
                            home_score = score_divs[0].get_text(strip=True)
                            away_score = score_divs[1].get_text(strip=True)
                    except: pass

                    current_minute = "Not started"
                    # Try multiple strategies to detect match time/status
                    try:
                         # Strategy 1: liveTimer element
                         timer_el = event_table_row.find('div', attrs={'data-test': 'liveTimer'})
                         if timer_el:
                             row_text_raw = timer_el.get_text(strip=True)
                             current_minute = "".join(row_text_raw.split())
                         
                         # Strategy 2: If still "Not started" but we have scores, look for halftime/other status
                         if current_minute == "Not started" and (home_score != "0" or away_score != "0"):
                             # Search for any text in the event row that might indicate halftime
                             # This searches all text in the row for common halftime indicators
                             row_text = event_table_row.get_text(separator=" ", strip=True).lower()
                             
                             # Check for halftime indicators
                             if any(indicator in row_text for indicator in ["medio tiempo", "descanso", "half time", "ht", "halftime"]):
                                 current_minute = "Half time"
                             # Check for full time
                             elif any(indicator in row_text for indicator in ["finalizado", "final", "ft", "full time"]):
                                 current_minute = "End"
                             else:
                                 # If we have scores but no time info, assume it's in play
                                 current_minute = "In play"
                    except: pass
                    
                    # HTML parsing only - no API fallbacks
                    
                    # League Header
                    league_header = {"name": "", "flag": ""}
                    try:
                        header_el = event_table_row.find_previous('div', attrs={'data-test': 'eventTableHeader'})
                        if header_el:
                            league_link = header_el.find('a', attrs={'data-test': 'leagueLink'})
                            if league_link: league_header["name"] = league_link.get_text(strip=True)
                            images = header_el.find_all('img')
                            if images:
                                img_el = images[-1]
                                raw_src = img_el.get('src') or ""
                                if raw_src.startswith('/'): league_header["flag"] = f"https://tonybet.es{raw_src}"
                                else: league_header["flag"] = raw_src
                    except: pass

                    # --- ODDS EXTRACTION (Hybrid) ---
                    # Default: None
                    odds_dict = {
                        "over_0_5_odds": None, "over_1_odds": None,
                        "over_1_5_odds": None, "over_2_odds": None,
                        "over_2_5_odds": None, "over_3_odds": None,
                        "combined_odds_3_5": None, "over_4_odds": None,
                        "combined_odds_4_5": None, "over_5_odds": None,
                        "over_5_5_odds": None, "over_6_odds": None,
                        "over_6_5_odds": None, "over_7_odds": None,
                        "over_7_5_odds": None, "over_8_odds": None,
                        "over_8_5_odds": None # Added per request
                    }
                    
                    # Look up in JSON cache
                    if match_db_id in odds_cache:
                        markets = odds_cache[match_db_id]
                        for market in markets:
                            # Total Goals Market (Id 18)
                            if market.get("vendorMarketId") == 18:
                                specifiers = market.get("specifiers", "")
                                # Parse total=X.X
                                total_match = re.search(r'total=([0-9.]+)', specifiers)
                                if total_match:
                                    try:
                                        line_val = float(total_match.group(1))
                                        
                                        # Find 'Over' outcome (Id 12 based on analysis)
                                        # But let's be robust: usually 12 is Over?
                                        # Fallback check:
                                        # If outcomes[0].id == 12?
                                        outcomes = market.get("outcomes", [])
                                        over_odd = None
                                        
                                        for out in outcomes:
                                            # Assuming 12 is Over.
                                            # Alternatively, check 'active': 1
                                            if str(out.get("vendorOutcomeId")) == "12":
                                                over_odd = out.get("odds")
                                                break
                                        
                                        if over_odd:
                                            # Map to keys
                                            if line_val == 0.5: odds_dict["over_0_5_odds"] = over_odd
                                            elif line_val == 1.0: odds_dict["over_1_odds"] = over_odd
                                            elif line_val == 1.5: odds_dict["over_1_5_odds"] = over_odd
                                            elif line_val == 2.0: odds_dict["over_2_odds"] = over_odd
                                            elif line_val == 2.5: odds_dict["over_2_5_odds"] = over_odd
                                            elif line_val == 3.0: odds_dict["over_3_odds"] = over_odd
                                            elif line_val == 3.5: odds_dict["combined_odds_3_5"] = over_odd
                                            elif line_val == 4.0: odds_dict["over_4_odds"] = over_odd
                                            elif line_val == 4.5: odds_dict["combined_odds_4_5"] = over_odd
                                            elif line_val == 5.0: odds_dict["over_5_odds"] = over_odd
                                            elif line_val == 5.5: odds_dict["over_5_5_odds"] = over_odd
                                            elif line_val == 6.0: odds_dict["over_6_odds"] = over_odd
                                            elif line_val == 6.5: odds_dict["over_6_5_odds"] = over_odd
                                            elif line_val == 7.0: odds_dict["over_7_odds"] = over_odd
                                            elif line_val == 7.5: odds_dict["over_7_5_odds"] = over_odd
                                            elif line_val == 8.0: odds_dict["over_8_odds"] = over_odd
                                            elif line_val == 8.5: odds_dict["over_8_5_odds"] = over_odd

                                    except: pass

                    # Construct Final Object
                    match_data = {
                        "id": str(match_db_id),
                        "league": "Live", 
                        "home_team": home_team,
                        "away_team": away_team,
                        "teams": f"{home_team} vs {away_team}",
                        "url": full_url,
                        "start_time": datetime.datetime.now().isoformat(),
                        "current_minute": current_minute,
                        "home_score": home_score,
                        "away_score": away_score,
                        "tournament": {
                            "name": "Live Matches", "id": 0, "urn_id": "0"
                        },
                        "league_header": league_header,
                        "competitors": {
                            "home": {"name": home_team, "logo": get_logo_url(home_team), "urn_id": "0"},
                            "away": {"name": away_team, "logo": get_logo_url(away_team), "urn_id": "0"}
                        },
                        **odds_dict # Unpack odds
                    }

                    # Filter None only if requested? Or keep keys for structure consistency?
                    # Original scraper filtered None.
                    # matches_to_scrape.append({k: v for k, v in match_data.items() if v is not None})
                    # But the frontend interface expects optional keys.
                    # It's cleaner to return keys even if null, or filter.
                    # "Filtering out matches with NO ODDS" was in old logic.
                    # If JSON found, we likely have odds.
                    matches_to_scrape.append(match_data)
                    scraped_ids.add(match_db_id)  # Use match_db_id instead of href
                    
                except Exception as e:
                    # print(f"Error processing row: {e}")
                    continue

        except Exception as e:
            print(f"Global error in fast scraper: {e}")
        finally:
            browser.close()
            
    return matches_to_scrape

if __name__ == "__main__":
    import json
    data = scrape_tonybet_fast()
    print(json.dumps(data, indent=2))

