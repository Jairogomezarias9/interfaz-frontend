import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import time
import datetime

def scrape_tonybet_prematch():
    matches_to_scrape = []
    scraped_ids = set()
    
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
        
        try:
            print("Navigating to Tonybet Prematch Football...")
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            page.goto("https://tonybet.com/cl/prematch/football", timeout=60000)
            
            # Wait for initial load
            try:
                page.wait_for_selector('div[data-test="eventTableRow"]', timeout=20000)
            except:
                print("Warning: Timeout waiting for eventTableRow.")

            print("Starting scrape loop (Scroll & Parse)...")
            
            no_change_count = 0
            max_scrolls = 30
            
            for i in range(max_scrolls):
                # 1. Parse visible content
                content = page.content()
                soup = BeautifulSoup(content, 'html.parser')
                rows = soup.find_all('div', attrs={'data-test': 'eventTableRow'})
                
                new_in_this_scroll = 0
                
                for row in rows:
                    try:
                        link_el = row.find('a', attrs={'data-test': 'eventLink'})
                        if not link_el: continue
                        
                        href = link_el.get('href')
                        if href in scraped_ids:
                            continue
                        
                        # Extract Data
                        full_url = f"https://tonybet.com{href}"
                        
                        # Date/Time
                        event_date = row.find('span', attrs={'data-test': 'eventDate'})
                        event_date = event_date.get_text(strip=True) if event_date else "Unknown"
                        
                        event_time = row.find('span', attrs={'data-test': 'eventTime'})
                        event_time = event_time.get_text(strip=True) if event_time else "Unknown"
                        
                        # Teams
                        team_names = row.find_all('div', attrs={'data-test': 'teamName'})
                        if len(team_names) >= 2:
                            home_team = team_names[0].get_text(strip=True)
                            away_team = team_names[1].get_text(strip=True)
                        else:
                            continue

                        # Odds (Over 2.5)
                        over_2_5_val = None
                        market_items = row.find_all('div', attrs={'data-test': 'marketItem'})
                        
                        for market_item in market_items:
                            outcomes = market_item.find_all(attrs={'data-test': 'outcome'})
                            if len(outcomes) >= 3:
                                line_val = outcomes[1].get_text(strip=True)
                                if line_val == "2.5":
                                    over_2_5_val = outcomes[2].get_text(strip=True)
                                    break
                        
                        if over_2_5_val:
                            match_data = {
                                "id": abs(hash(href)),
                                "league": "Prematch",
                                "home_team": home_team,
                                "away_team": away_team,
                                "teams": f"{home_team} vs {away_team}",
                                "url": full_url,
                                "event_date": event_date,
                                "event_time": event_time,
                                "start_time": f"{event_date} {event_time}",
                                "over_2_5_odds": over_2_5_val,
                                "competitors": {
                                    "home": {"name": home_team, "logo": "/logoreal.png"},
                                    "away": {"name": away_team, "logo": "/logoreal.png"}
                                }
                            }
                            matches_to_scrape.append(match_data)
                            scraped_ids.add(href)
                            new_in_this_scroll += 1
                            print(f"[Match Found] {home_team} vs {away_team} | Over 2.5: {over_2_5_val}")
                            
                    except Exception as e:
                        continue
                
                print(f"Scroll {i+1}/{max_scrolls}: Found {new_in_this_scroll} new matches (Total: {len(matches_to_scrape)})")
                
                # 2. Scroll Logic
                previous_height = page.evaluate("document.body.scrollHeight")
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2) # Wait for load
                
                current_height = page.evaluate("document.body.scrollHeight")
                
                if current_height == previous_height:
                    no_change_count += 1
                    # Try pressing End key to trigger lazy load
                    page.keyboard.press("End")
                    time.sleep(1)
                else:
                    no_change_count = 0
                    
                if no_change_count >= 3:
                    print("No more content loading. Stopping.")
                    break
            
        except Exception as e:
            print(f"Global error in prematch scraper: {e}")
        finally:
            browser.close()
            
    return matches_to_scrape

if __name__ == "__main__":
    data = scrape_tonybet_prematch()
    print(f"Total Scraped: {len(data)}")
