import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import time
import datetime

def scrape_tonybet():
    matches_to_scrape = []
    final_matches = []
    
    with sync_playwright() as p:
        # CONFIGURACIÓN DEL PROXY (IMPORTANTE: Tonybet.es bloquea IPs fuera de España)
        # Si tu VPS no está en España, necesitas un proxy residencial español.
        # Formato: "http://usuario:contraseña@ip:puerto" o "http://ip:puerto"
        proxy_config = None 
        # Ejemplo: proxy_config = {"server": "http://usuario:pass@1.2.3.4:8080"}
        
        launch_options = {
            "headless": True, # Reverted to True for VPS
            "args": [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        }
        
        if proxy_config:
            launch_options["proxy"] = proxy_config

        # Launch browser with extra args for VPS/Headless stability
        browser = p.chromium.launch(**launch_options)
        
        # Use a real user agent and viewport to avoid detection
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        
        try:
            print("Navigating to Tonybet International...")
            # Add stealth scripts
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            # Changed from tonybet.es to tonybet.com for international/German access
            page.goto("https://tonybet.com/cl/live/football", timeout=60000)
            
            print(f"Current URL: {page.url}")
            print(f"Page Title: {page.title()}")

            # Wait for the main content to load
            try:
                # Updated selector based on user feedback
                page.wait_for_selector('div[data-test="eventsTable"]', timeout=20000) # Increased timeout
            except:
                print("Could not find 'div[data-test=\"eventsTable\"]', waiting for any 'a' tag with live/football")
                try:
                    page.wait_for_selector('a[href*="/live/football/"]', timeout=15000)
                except:
                    print("Timeout waiting for selectors. Taking screenshot for debug...")
                    try:
                        page.screenshot(path="debug_screenshot.png")
                        print("Screenshot saved to debug_screenshot.png")
                    except:
                        pass
                    print("Continuing with whatever content is there.")

            # Handle "Create Account" popup if it appears
            try:
                # Generic close button selector, might need adjustment based on actual popup
                # User mentioned closing an alert.
                # Often these are modals with a close 'x' or 'No thanks' button.
                # We'll try to find a common modal close button or just press Escape
                page.keyboard.press("Escape")
                
                # Also try clicking the 'X' button if visible
                # Based on screenshot, it's a modal with a close button
                try:
                    page.click('button[aria-label="Close"]', timeout=2000)
                except:
                    pass
                    
                # Try clicking outside the modal
                try:
                    page.mouse.click(10, 10)
                except:
                    pass
                    
            except:
                pass

            # Scroll to load more matches
            print("Scrolling to load all matches...")
            
            last_match_count = 0
            same_count_iterations = 0
            max_scrolls = 10 # Changed to 10 as requested
            
            for i in range(max_scrolls):
                # Count matches to see if we are actually loading new ones
                # Using 'teamSeoTitles' as requested by user
                current_match_count = page.evaluate("document.querySelectorAll('div[data-test=\"teamSeoTitles\"]').length")
                print(f"Scroll {i+1}/{max_scrolls}: Found {current_match_count} matches.")
                
                if current_match_count > last_match_count:
                    same_count_iterations = 0
                    last_match_count = current_match_count
                else:
                    same_count_iterations += 1
                    
                # Increased wait tolerance: 15 iterations * 1s = 15s of no changes before giving up
                # This prevents stopping too early if the network is slow
                if same_count_iterations >= 15: 
                    print("No new matches found for 15 iterations, stopping scroll.")
                    break
                
                # Stop scrolling if we have enough matches (Max 30)
                if current_match_count >= 30:
                    print("Reached limit of 30 matches. Stopping scroll.")
                    break

                # Scroll Logic - More aggressive
                # 1. Scroll Window to bottom
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                
                # 2. Keyboard End (often triggers lazy load better)
                try:
                    page.keyboard.press("End")
                except:
                    pass

                # 3. Scroll to the last element specifically
                try:
                    page.evaluate("""
                        const elements = document.querySelectorAll('div[data-test="teamSeoTitles"]');
                        if (elements.length > 0) {
                            elements[elements.length - 1].scrollIntoView();
                        }
                    """)
                except:
                    pass
                
                time.sleep(1) # Wait for network and render
            
            content = page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Strategy: Search for teamSeoTitles
            # This is the most reliable element according to user feedback
            team_titles_containers = soup.find_all('div', attrs={'data-test': 'teamSeoTitles'})
            print(f"Found {len(team_titles_containers)} teamSeoTitles (matches).")
            
            for team_titles_container in team_titles_containers:
                try:
                    # Find the parent link using the new selector provided by user
                    # User says: "para entrar en un partido concreto, lo tienes en eventLink"
                    # Looking for parent or sibling with data-test="eventLink"
                    
                    # First try to find the link directly if we are iterating containers
                    # But wait, we are iterating teamSeoTitles.
                    # Let's look up to find the common container, then find eventLink
                    
                    # Go up to find the row or container
                    parent_row = team_titles_container.find_parent('div', attrs={'data-test': 'eventContainer'})
                    if not parent_row:
                         # Try going up a bit more just in case
                         parent_row = team_titles_container.find_parent('div', class_=lambda x: x and 'FPToc' in x) # Based on screenshot class="-1-2n FPToc"
                    
                    link_el = None
                    if parent_row:
                        # Try to find the link inside this container
                        link_el = parent_row.find_parent('a', attrs={'data-test': 'eventLink'})
                        if not link_el:
                             # Maybe the link is a sibling or inside?
                             # In the screenshot, <a> wraps the eventContainer
                             link_el = team_titles_container.find_parent('a', attrs={'data-test': 'eventLink'})
                    
                    if not link_el:
                        # Fallback: just look for closest parent 'a'
                        link_el = team_titles_container.find_parent('a', href=True)
                    
                    if not link_el:
                        print("  Found teamSeoTitles but no parent link.")
                        continue
                        
                    href = link_el.get('href')
                    
                    # Relaxed filter: just check for 'football' or 'soccer'
                    if 'football' not in href and 'soccer' not in href:
                        # print(f"Skipping non-football match: {href}")
                        continue
                        
                    full_url = f"https://tonybet.com{href}"
                    
                    # Try to find league name
                    league_name = "Unknown League"
                    try:
                        parent = link_el.find_parent('div', attrs={'data-test': 'eventsTable'})
                        if parent:
                            header = parent.find('div', attrs={'data-test': 'eventTableHeader'})
                            if header:
                                league_name = header.get_text(strip=True)
                                league_name = league_name.replace("1X2UTotalO", "").strip()
                    except:
                        pass
                    
                    home_team = "Unknown Home"
                    away_team = "Unknown Away"
                    
                    # Extract teams from teamSeoTitles
                    # User specified that inside teamSeoTitles there are divs with data-test="teamName"
                    team_name_divs = team_titles_container.find_all('div', attrs={'data-test': 'teamName'})
                    
                    if len(team_name_divs) >= 2:
                        home_team = team_name_divs[0].get_text(strip=True)
                        away_team = team_name_divs[1].get_text(strip=True)
                    else:
                        # Fallback to previous method just in case
                        team_divs = team_titles_container.find_all('div', recursive=False)
                        if len(team_divs) >= 2:
                            home_team = team_divs[0].get_text(strip=True)
                            away_team = team_divs[1].get_text(strip=True)
                        else:
                            texts = list(team_titles_container.stripped_strings)
                            if len(texts) >= 2:
                                home_team = texts[0]
                                away_team = texts[1]
                            
                    # Clean team names
                    home_team = re.sub(r'\d+$', '', home_team).strip()
                    away_team = re.sub(r'\d+$', '', away_team).strip()

                    # Store basic match info to scrape details later
                    matches_to_scrape.append({
                        "id": abs(hash(href)),
                        "league": league_name,
                        "home_team": home_team,
                        "away_team": away_team,
                        "teams": f"{home_team} vs {away_team}",
                        "url": full_url,
                        "start_time": datetime.datetime.now().isoformat(),
                        # Initialize all odds to None (1.0 to 8.0)
                        "over_1_odds": None, "over_1_5_odds": None,
                        "over_2_odds": None, "over_2_5_odds": None,
                        "over_3_odds": None, "combined_odds_3_5": None,
                        "over_4_odds": None, "combined_odds_4_5": None,
                        "over_5_odds": None, "over_5_5_odds": None,
                        "over_6_odds": None, "over_6_5_odds": None,
                        "over_7_odds": None, "over_7_5_odds": None,
                        "over_8_odds": None,
                        "tournament": {"name": league_name},
                        "competitors": {
                            "home": {"name": home_team, "logo": "/logoreal.png"},
                            "away": {"name": away_team, "logo": "/logoreal.png"}
                        }
                    })
                    
                except Exception as e:
                    print(f"Error parsing match: {e}")
                    continue
        
            print(f"Collected {len(matches_to_scrape)} matches. Starting detailed scrape...")
            
            # Limit to max 30 matches
            matches_to_scrape = matches_to_scrape[:30]
            
            # Reorder: Move the last match to the start to act as a "warm-up"
            # The first match often fails/timeouts, so we sacrifice the last one (usually less important)
            if len(matches_to_scrape) > 1:
                last_match = matches_to_scrape.pop()
                matches_to_scrape.insert(0, last_match)
                print("  Moved last match to front to prevent first-match timeout issues.")
                
            print(f"Processing top {len(matches_to_scrape)} matches.")
            
            # Detailed Scrape Loop
            for i, match in enumerate(matches_to_scrape):
                print(f"[{i+1}/{len(matches_to_scrape)}] Scraping details: {match['home_team']} vs {match['away_team']}")
                try:
                    # Retry logic
                    for attempt in range(2):
                        try:
                            # Only navigate if we are not already on the page (from a previous recovery)
                            # But checking URL is tricky if it redirects.
                            # Let's just navigate.
                            
                            # Use domcontentloaded to be faster and less strict about network connections
                            page.goto(match['url'], timeout=60000, wait_until='domcontentloaded')
                            
                            # Wait a bit for SPA hydration
                            time.sleep(2)
                            
                            # Handle Popups AGAIN on the match page
                            try:
                                page.keyboard.press("Escape")
                                try:
                                    page.click('button[aria-label="Close"]', timeout=1000)
                                except:
                                    pass
                            except:
                                pass
                            
                            # Check if we are actually on the right page
                            current_url = page.url
                            current_title = page.title()
                            # print(f"  Current URL: {current_url}")
                            # print(f"  Page Title: {current_title}")
                            
                            # IMMEDIATE RECOVERY CHECK
                            if "live/football" in current_url and match['url'] != current_url and len(match['url']) > len(current_url) + 20:
                                 print(f"  WARNING: Potential redirect to main list. Expected: {match['url']}, Got: {current_url}")
                                 # Try recovery for any match
                                 try:
                                    team_name = match['home_team']
                                    print(f"  Attempting generic recovery for '{team_name}'...")
                                    
                                    # Try to find the container with the team name and clicking it
                                    # Using a more robust selector strategy
                                    clicked = False
                                    try:
                                        # Handle popup BEFORE trying to click
                                        try:
                                            page.keyboard.press("Escape")
                                            page.click('button[aria-label="Close"]', timeout=1000)
                                        except:
                                            pass
                                            
                                        # Look for the specific match container in the list
                                        # We know the structure from the main loop: div[data-test="teamSeoTitles"]
                                        # We can find the one containing our team text
                                        print(f"    Looking for element with text: {team_name}")
                                        
                                        # Try exact text first
                                        try:
                                            page.click(f"text='{team_name}'", timeout=2000)
                                            clicked = True
                                            print("    Clicked using exact text match")
                                        except:
                                            # Try partial text
                                            try:
                                                page.click(f"text={team_name}", timeout=2000)
                                                clicked = True
                                                print("    Clicked using partial text match")
                                            except:
                                                # Try finding inside the container
                                                page.click(f"div[data-test='teamSeoTitles']:has-text('{team_name}')", timeout=2000)
                                                clicked = True
                                                print("    Clicked using container match")
                                    except Exception as e:
                                        print(f"    Click failed: {e}")
                                        try:
                                            # Last resort: Javascript click
                                            page.evaluate(f"""
                                                const elements = [...document.querySelectorAll('div[data-test="teamSeoTitles"]')];
                                                const target = elements.find(el => el.textContent.includes("{team_name}"));
                                                if (target) {{
                                                    // Find the parent link
                                                    const link = target.closest('a');
                                                    if (link) link.click();
                                                    else target.click();
                                                }} else {{
                                                    throw new Error("Element not found via JS");
                                                }}
                                            """)
                                            clicked = True
                                            print("    Clicked using JS fallback")
                                        except Exception as js_e:
                                            print(f"    JS Click failed: {js_e}")
                                            
                                    if clicked:
                                        page.wait_for_load_state('domcontentloaded')
                                        time.sleep(3)
                                        print(f"  New URL after click: {page.url}")
                                 except:
                                    pass

                            # Wait for market wrapper and content
                            try:
                                page.wait_for_selector('div[data-test="sportPageWrapper"]', timeout=30000)
                                # Crucial: Wait for the actual data elements to appear
                                # Sometimes factor-name is not immediately available or has a different test id
                                # Let's wait for the main market container instead
                                try:
                                    page.wait_for_selector('div[data-test="fullEventMarket"]', timeout=15000)
                                except:
                                    # If fullEventMarket is not found, maybe it's a different structure or empty
                                    # Try waiting for the additional market directly as fallback
                                    page.wait_for_selector('div[data-test="sport-event-table-additional-market"]', timeout=10000)
                            except:
                                print(f"  Timeout waiting for content (Attempt {attempt+1}). URL: {page.url} Title: {page.title()}")
                                # Take a screenshot on timeout
                                try:
                                    screenshot_path = f"timeout_{match['id']}.png"
                                    page.screenshot(path=screenshot_path)
                                    print(f"  Saved screenshot to {screenshot_path}")
                                except:
                                    pass
                                
                                # RECOVERY LOGIC IN EXCEPTION
                                # If we timed out and we are on the main list, try to click the match
                                if "live/football" in page.url and len(page.url) < len(match['url']) - 10:
                                     print("  Timeout on main list detected. Attempting recovery by clicking match...")
                                     try:
                                        team_name = match['home_team']
                                        # Try multiple selectors
                                        # 1. Exact text
                                        # 2. Partial text
                                        # 3. Inside teamSeoTitles
                                        
                                        clicked = False
                                        try:
                                            page.click(f"text={team_name}", timeout=3000)
                                            clicked = True
                                        except:
                                            try:
                                                # Try finding the container with the team name and clicking it
                                                page.click(f"div[data-test='teamSeoTitles']:has-text('{team_name}')", timeout=3000)
                                                clicked = True
                                            except:
                                                pass
                                        
                                        if clicked:
                                            print(f"  Clicked on team name '{team_name}'")
                                            page.wait_for_load_state('domcontentloaded')
                                            time.sleep(3)
                                            print(f"  New URL after click: {page.url}")
                                            
                                            # If we successfully clicked, we should try to wait for content again
                                            # But we are in the except block.
                                            # We can just let the loop continue to the next attempt?
                                            # Or try to wait here?
                                            # Let's try to wait here briefly to see if it worked
                                            try:
                                                page.wait_for_selector('div[data-test="fullEventMarket"]', timeout=10000)
                                                print("  Recovery successful! Found markets.")
                                                # If successful, we need to break out of the retry loop? 
                                                # No, we are in the except block which will continue to next attempt or finish.
                                                # Actually, if we are in except, we go to "if attempt == 0: continue".
                                                # So the NEXT attempt will try page.goto again... which might redirect again.
                                                # We need to avoid page.goto if we just recovered.
                                                
                                                # Hack: If we recovered, we can just proceed?
                                                # But the code structure is: try -> goto -> wait -> break.
                                                # If we are here, we failed wait.
                                                # If we recovered, we are now on the page.
                                                # We should probably NOT continue to next attempt if we recovered.
                                                # But we can't easily jump back to "wait".
                                                
                                                # Let's just let the loop retry. 
                                                # BUT, the next attempt calls page.goto(match['url']).
                                                # If that URL is "cursed" and redirects, we are stuck in a loop.
                                                
                                                # We need to update match['url']? No.
                                                # We need to tell the next iteration NOT to goto?
                                                pass
                                            except:
                                                pass
                                        else:
                                            print(f"  Could not find element to click for '{team_name}'")
                                     except Exception as e:
                                        print(f"  Recovery failed: {e}")

                                if attempt == 0:
                                    print("  Retrying...")
                                    continue
                            
                            # Scroll down inside the match page to ensure all markets load
                            # Scroll in steps to trigger lazy loading
                            page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                            time.sleep(0.5)
                            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                            time.sleep(2) # Increased wait time
                            
                            break # Success, exit retry loop
                        except Exception as e:
                            print(f"  Error loading page (Attempt {attempt+1}): {e}")
                            if attempt == 0: continue

                    content = page.content()
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Find Total Market using new selectors
                    # Strategy: Iterate through all fullEventMarket blocks (top-down) based on provided HTML structure
                    
                    full_markets = soup.find_all('div', attrs={'data-test': 'fullEventMarket'})
                    print(f"  Found {len(full_markets)} market blocks.")
                    
                    if len(full_markets) == 0:
                        print(f"  WARNING: No markets found for {match['url']}")
                        debug_filename = f"debug_failed_{match['id']}.html"
                        try:
                            with open(debug_filename, "w", encoding="utf-8") as f:
                                f.write(soup.prettify())
                            print(f"  Saved HTML dump to {debug_filename}")
                            
                            # Also take a screenshot
                            page.screenshot(path=f"debug_failed_{match['id']}.png")
                            print(f"  Saved screenshot to debug_failed_{match['id']}.png")
                        except Exception as e:
                            print(f"  Could not save debug info: {e}")
                    
                    found_total_market = False
                    
                    for market_container in full_markets:
                        # Check header inside the market container
                        header = market_container.find('div', attrs={'data-test': 'sport-event-table-market-header'})
                        if not header:
                            # Fallback: try finding the span directly
                            header = market_container.find('span', class_='Lde72')
                            
                        if not header:
                            continue
                            
                        header_text = header.get_text(strip=True).lower()
                        # print(f"    Checking market header: '{header_text}'")
                        
                        # Check for "Total" variations
                        is_target_market = False
                        if header_text in ["total", "total (incl. overtime)", "total de goles", "total goals"]:
                            is_target_market = True
                            
                        if not is_target_market:
                            continue
                            
                        print(f"  Found target market header: {header_text}")
                        found_total_market = True
                        
                        # We are already in the market_container, so we proceed directly
                        if market_container:
                            # Now find the rows inside THIS market container
                            additional_markets = market_container.find_all('div', attrs={'data-test': 'sport-event-table-additional-market'})
                            
                            for market in additional_markets:
                                # Find the name of the market/factor
                                factor_name_div = market.find('div', attrs={'data-test': 'factor-name'})
                                if not factor_name_div:
                                    continue
                                    
                                text = factor_name_div.get_text(" ", strip=True).lower()
                                
                                # Check for Over 1.0 to 8.0 (integers and .5s)
                                target_key = None
                                
                                # Regex to find "Más de X" or "Over X"
                                # Handles integers (1, 2) and decimals (1.5, 2.5)
                                line_match = re.search(r'(?:más de|over)\s+(\d+(?:\.\d+)?)', text)
                                
                                if line_match:
                                    try:
                                        line_val = float(line_match.group(1))
                                        
                                        # Map line value to key
                                        if line_val == 1.0: target_key = "over_1_odds"
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
                                    except:
                                        pass
                                else:
                                    # print(f"    No line match for: '{text}'")
                                    pass
                                
                                if target_key:
                                    # Find the odd value
                                    odd_span = market.find('span', attrs={'data-test': 'additionalOdd'})
                                    if odd_span:
                                        odd_value = odd_span.get_text(strip=True)
                                        match[target_key] = odd_value
                                        print(f"    Found {target_key}: {odd_value}")
                                    else:
                                        print(f"    Found target key {target_key} but no odd span")
                        
                        # Break after processing the correct Total market to avoid duplicates
                        break                    
                    if not found_total_market:
                        print("  'Total' market not found for this match. Skipping.")
                        # We don't need to do anything else, the loop finishes and we move to next match
                        # But we can explicitly continue the outer loop if we had more logic below
                        continue
                    # Legacy/Fallback logic for fullEventMarket (kept just in case)
                    # Legacy/Fallback logic for fullEventMarket (kept just in case)
                    full_markets = soup.find_all('div', attrs={'data-test': 'fullEventMarket'})
                    for market in full_markets:
                        pass
                    
                    final_matches.append(match)
                        
                except Exception as e:
                    print(f"  Error scraping details: {e}")
                    final_matches.append(match)
                
        except Exception as e:
            print(f"Global scraping error: {e}")
        finally:
            browser.close()
            
    return final_matches

if __name__ == "__main__":
    data = scrape_tonybet()
    print(f"Scraped {len(data)} matches.")
    # print(data)
