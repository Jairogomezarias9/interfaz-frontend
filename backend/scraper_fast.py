import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import time
import datetime
import os

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
    
    with sync_playwright() as p:
        # CONFIGURACIÓN DEL PROXY (Copiado de scraper.py)
        proxy_config = None 
        
        launch_options = {
            "headless": True,
            "args": [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        }
        
        if proxy_config:
            launch_options["proxy"] = proxy_config

        browser = p.chromium.launch(**launch_options)
        
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        
        try:
            print("Navigating to Tonybet Live Football (Fast Mode)...")
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            # Live URL
            page.goto("https://tonybet.com/cl/live/football", timeout=60000)
            
            print(f"Current URL: {page.url}")
            
            # Wait for initial load
            try:
                page.wait_for_selector('div[data-test="teamSeoTitles"]', timeout=20000)
            except:
                print("Warning: Timeout waiting for teamSeoTitles. Trying to proceed...")

            print("Starting scrape loop (Scroll & Parse)...")
            
            # SCROLLING PHASE (Like scraper.py)
            # First, scroll to load all matches
            last_match_count = 0
            same_count_iterations = 0
            max_scroll_iterations = 5 # Limit to 5 scrolls as requested
            
            for i in range(max_scroll_iterations):
                # 0. Handle Popups
                try:
                    page.keyboard.press("Escape")
                    close_btns = page.locator('button[aria-label="Close"], button[class*="close"], div[class*="modal"] button')
                    if close_btns.count() > 0:
                        for btn_idx in range(close_btns.count()):
                            if close_btns.nth(btn_idx).is_visible():
                                close_btns.nth(btn_idx).click(timeout=200)
                except:
                    pass

                # Check match count
                current_match_count = page.evaluate("document.querySelectorAll('div[data-test=\"teamSeoTitles\"]').length")
                print(f"Scroll {i+1}/{max_scroll_iterations}: Visible matches: {current_match_count}")
                
                if current_match_count > last_match_count:
                    same_count_iterations = 0
                    last_match_count = current_match_count
                else:
                    same_count_iterations += 1
                
                if same_count_iterations >= 5:
                    print("No new matches found for 5 iterations. Stopping scroll.")
                    break
                
                # Scroll Logic (Robust mix)
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(0.5)
                page.keyboard.press("End")
                time.sleep(0.5)
                
                # Scroll to last element to trigger lazy load
                try:
                    page.evaluate("""
                        const elements = document.querySelectorAll('div[data-test="teamSeoTitles"]');
                        if (elements.length > 0) {
                            elements[elements.length - 1].scrollIntoView();
                        }
                    """)
                except:
                    pass
                
                time.sleep(1.5) # Wait for network

            # PARSING PHASE
            print("Scrolling finished. Parsing all loaded matches...")
            content = page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Use teamSeoTitles as the anchor
            team_titles_containers = soup.find_all('div', attrs={'data-test': 'teamSeoTitles'})
            
            for team_titles_container in team_titles_containers:
                try:
                    # Find the parent row (eventTableRow)
                    event_table_row = team_titles_container.find_parent('div', attrs={'data-test': 'eventTableRow'})
                    if not event_table_row:
                        continue
                        
                    # Find the link (eventLink) inside the row
                    link_el = event_table_row.find('a', attrs={'data-test': 'eventLink'})
                    if not link_el:
                        continue
                        
                    href = link_el.get('href')
                    if href in scraped_ids:
                        continue
                        
                    # Relaxed filter
                    if 'football' not in href and 'soccer' not in href:
                        continue
                    
                    # Extract Data
                    full_url = f"https://tonybet.com{href}"
                    
                    # Teams
                    home_team = "Unknown Home"
                    away_team = "Unknown Away"
                    
                    team_name_divs = team_titles_container.find_all('div', attrs={'data-test': 'teamName'})
                    if len(team_name_divs) >= 2:
                        home_team = team_name_divs[0].get_text(strip=True)
                        away_team = team_name_divs[1].get_text(strip=True)
                    else:
                        continue
                        
                    # Clean team names
                    home_team = re.sub(r'\d+$', '', home_team).strip()
                    away_team = re.sub(r'\d+$', '', away_team).strip()

                    # Extract Scores
                    home_score = "0"
                    away_score = "0"
                    try:
                        score_divs = team_titles_container.find_all('div', attrs={'data-test': 'teamScore'})
                        if len(score_divs) >= 2:
                            home_score = score_divs[0].get_text(strip=True)
                            away_score = score_divs[1].get_text(strip=True)
                    except:
                        pass

                    # Extract Match Time
                    current_minute = "Not started"
                    try:
                        # Try to find timer in the whole row, not just the link
                        timer_el = event_table_row.find('div', attrs={'data-test': 'liveTimer'})
                        if timer_el:
                            # STRICT CHECK: Only consider it LIVE if the 'live-timer.svg' icon is present in the row.
                            # ALSO check for 'pause' icon or 'status-pause' which appears at Half Time / Breaks.
                            has_live_indicator = event_table_row.find('img', src=re.compile(r'(live-timer|pause|icon-live|timer).*', re.IGNORECASE)) is not None
                            
                            # FALLBACK: Check for "LIVE" badge/text explicitly
                            # This handles cases where the icon is missing or different (like just a red badge)
                            row_text_full = event_table_row.get_text(" ", strip=True).upper()
                            has_live_badge = "LIVE" in row_text_full
                            
                            row_text_raw = timer_el.get_text(strip=True)
                            
                            # If we found a live/pause icon OR the text explicitly says "HT"/"45:00" OR we found a "LIVE" badge
                            is_half_time = "HT" in row_text_raw.upper() or "45:00" in row_text_raw or "HALF TIME" in row_text_raw.upper()
                            
                            if not has_live_indicator and not is_half_time and not has_live_badge:
                                current_minute = "Not started"
                            else:
                                current_minute = "".join(row_text_raw.split())
                    except:
                        pass
                    
                    # Fallback if simple extraction failed
                    if current_minute == "Not started":
                        try:
                            # Search in the full text of the row for patterns like "34:12" or "45'"
                            row_text = event_table_row.get_text(" ", strip=True) 
                            
                            # Validates explicitly marked minutes (45') or HT.
                            # We avoid greedy MM:SS regex to prevent "16:00" start times being parsed.
                            
                            min_match = re.search(r'\b([0-9]{1,3}\+?[0-9]*)\'', row_text)
                            if min_match:
                                current_minute = min_match.group(0)
                            else:
                                if "HT" in row_text or "Half Time" in row_text:
                                    current_minute = "HT"
                        except:
                            pass

                    
                    # Extract League Header (Name & Flag)
                    league_header = {"name": "No header found", "flag": ""} 
                    try:
                        # Use find_previous to robustly find the nearest preceding header in the DOM tree
                        # This ignores nesting differences (sibling vs nephew etc)
                        header_el = event_table_row.find_previous('div', attrs={'data-test': 'eventTableHeader'})
                        
                        if header_el:
                            # League Name
                            league_link = header_el.find('a', attrs={'data-test': 'leagueLink'})
                            if league_link:
                                league_header["name"] = league_link.get_text(strip=True)
                            
                            # Flag - Logic update: User reported grabbing "left" image (wrong one).
                            # Likely there's a Sport Icon (img[0]) and League Flag (img[1]).
                            # We take the LAST image found in the header to be safe.
                            images = header_el.find_all('img')
                            if images:
                                # Taking the last one is a good heuristic if 'sport icon' is first
                                img_el = images[-1] 
                                raw_src = img_el.get('src') or ""
                                if raw_src.startswith('/'):
                                    league_header["flag"] = f"https://tonybet.com{raw_src}"
                                else:
                                    league_header["flag"] = raw_src
                    except Exception as e:
                        print(f"Error extracting header: {e}")
                        pass

                    # Initialize odds
                    match_data = {
                        "id": str(abs(hash(href))),
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
                            "name": "Live Matches",
                            "id": 0,
                            "urn_id": "0"
                        },
                        "league_header": league_header,
                        "competitors": {
                            "home": {"name": home_team, "logo": get_logo_url(home_team), "urn_id": "0"},
                            "away": {"name": away_team, "logo": get_logo_url(away_team), "urn_id": "0"}
                        },
                        "over_1_odds": None, "over_1_5_odds": None,
                        "over_2_odds": None, "over_2_5_odds": None,
                        "over_3_odds": None, "combined_odds_3_5": None,
                        "over_4_odds": None, "combined_odds_4_5": None,
                        "over_5_odds": None, "over_5_5_odds": None,
                        "over_6_odds": None, "over_6_5_odds": None,
                        "over_7_odds": None, "over_7_5_odds": None,
                        "over_8_odds": None,
                    }

                    # Extract Odds
                    # Look for marketItems in the row wrapper (sibling of eventTableRow or parent's children)
                    # Based on snippet: eventTableRow and SZxOo (containing marketItems) are siblings in ceJqP FXcxn
                    row_wrapper = event_table_row.parent
                    if row_wrapper:
                        market_items = row_wrapper.find_all('div', attrs={'data-test': 'marketItem'})
                        
                        found_odds = False
                        for market_item in market_items:
                            outcomes = market_item.find_all(attrs={'data-test': 'outcome'})
                            if len(outcomes) == 3:
                                # Structure: [Over/Odd] [Line] [Under/Odd]
                                # We check if the middle one is a number (Line)
                                col1_el = outcomes[0]
                                col2_el = outcomes[1]
                                col3_el = outcomes[2]
                                
                                col1_text = col1_el.get_text(strip=True)
                                col2_text = col2_el.get_text(strip=True) # Potential Line
                                col3_text = col3_el.get_text(strip=True)
                                
                                # CRITICAL: Ensure Middle Column is NOT a clickable odd (like Draw)
                                # Clickable odds usually have 'TwlBg' or similar classes.
                                # Lines usually are just text or have different classes.
                                # We check if the parent of the text has 'TwlBg'
                                is_odd_button = False
                                if col2_el.find_parent(class_=lambda x: x and 'TwlBg' in x):
                                    is_odd_button = True
                                
                                # Also check if the element itself has TwlBg (just in case)
                                if 'TwlBg' in str(col2_el):
                                    is_odd_button = True
                                    
                                if is_odd_button:
                                    continue # Skip 1x2 markets where middle is Draw odd

                                try:
                                    line_val = float(col2_text)
                                    
                                    # It is a line. Map to key.
                                    target_key = None
                                    if line_val == 0.5: target_key = "over_0_5_odds"
                                    elif line_val == 1.0: target_key = "over_1_odds"
                                    elif line_val == 1.5: target_key = "over_1_5_odds"
                                    elif line_val == 2.0: target_key = "over_2_odds"
                                    elif line_val == 2.5: target_key = "over_2_5_odds"
                                    elif line_val == 3.0: target_key = "over_3_odds"
                                    elif line_val == 3.5: target_key = "combined_odds_3_5"
                                    elif line_val == 4.0: target_key = "over_4_odds"
                                    elif line_val == 4.5: target_key = "combined_odds_4_5"
                                    elif line_val == 5.0: target_key = "over_5_odds"
                                    elif line_val == 5.5: target_key = "over_5_5_odds"
                                    elif line_val == 6.0: target_key = "over_6_odds"
                                    elif line_val == 6.5: target_key = "over_6_5_odds"
                                    elif line_val == 7.0: target_key = "over_7_odds"
                                    elif line_val == 7.5: target_key = "over_7_5_odds"
                                    elif line_val == 8.0: target_key = "over_8_odds"
                                    
                                    if target_key:
                                        # Col3 is Over (User specified right side)
                                        match_data[target_key] = col3_text
                                        found_odds = True
                                        # print(f"  -> Found: Line {line_val}, Over {col3_text}")
                                        
                                except ValueError:
                                    continue

                    # Filter out matches with NO ODDS (to avoid ghost/finished/upcoming games without markets)
                    # if not found_odds:
                    #     continue

                    # Filter out None values (User request: "solo el que tiene valor")
                    match_data = {k: v for k, v in match_data.items() if v is not None}

                    matches_to_scrape.append(match_data)
                    scraped_ids.add(href)
                        
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"Global error in fast scraper: {e}")
        finally:
            browser.close()
            
    return matches_to_scrape

if __name__ == "__main__":
    data = scrape_tonybet_fast()
    print(f"Total Scraped: {len(data)}")
