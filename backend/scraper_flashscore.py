from playwright.sync_api import sync_playwright
import json
import time
import re

OUTPUT_FILE = "flashscore_live.json"

def clean_ws_payload(payload):
    """
    Cleans FlashScore WebSocket payload by removing binary delimiters 
    (\x01, \x1f, etc.) and extracting the valid JSON part.
    """
    try:
        if isinstance(payload, bytes):
            payload = payload.decode('utf-8', errors='ignore')
            
        # FlashScore messages often start with some binary junk and then have JSON-like structure
        # We look for the "eventSummaryOddsStatsUpdate" key which indicates stats data
        if "eventSummaryOddsStatsUpdate" not in payload:
            return None

        # Clean specific binary chars used as separators
        # \x1e, \x1f are record separators
        cleaned = payload.replace('\x00', '')
        
        # Try to find the start of the JSON object
        # It usually follows a pattern like `...: { ...`
        # We'll use a regex to extract the main JSON block if possible, 
        # but given the hybrid format, we might need to be looser.
        
        # Strategy: The payload is often "mixed". 
        # Example: `... \x1f\x07:{\x1f\x07__typename...`
        # We will attempt to sanitize string to valid JSON by replacing control chars
        # OR extracting the meaningful parts manually via regex.
        
        return payload
        
    except Exception as e:
        print(f"Error cleaning payload: {e}")
        return None

def extract_stats_from_payload(payload):
    """
    Parses the messy payload string to extract stats key-values.
    We use regex because the JSON is often malformed with control chars.
    """
    stats = {}
    
    # Regex to find type/value pairs. 
    # Pattern seen: "type":"shots_on_goal", "label":"5", "value":"5"
    # Note: delimiters might be \x1f or similar, so we use .? or [\x00-\x1f]*
    
    # We look for blocks like: type...value...
    # Let's try to find all occurrences of "type" and the associated "value"
    
    # This regex looks for: type...:...(KEY)...value...:...(VAL)
    # It attempts to capture the key (e.g. shots_on_goal) and value (e.g. 5)
    # handling the intermediate chars.
    matches = re.finditer(r'type\W+([a-zA-Z0-9_]+).*?value\W+([0-9.]+)', payload)
    
    for m in matches:
        key = m.group(1)
        val = m.group(2)
        stats[key] = val
        
    return stats

def scrape_flashscore():
    print("Starting FlashScore Scraper (WS Interception)...")
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        
        # 1. Get Live Matches List
        page = context.new_page()
        page.goto("https://www.flashscore.es/futbol/", timeout=60000)
        
        try:
            page.get_by_id("onetrust-accept-btn-handler").click(timeout=5000)
        except: pass
        
        try:
            page.locator("div.filters__tab:has-text('Directo')").click()
            time.sleep(3)
        except:
            print("Could not click Directo tab")

        # Extract Match IDs
        match_ids = []
        elements = page.locator("div.event__match--live").all()
        # If no live explicit class, try generic
        if not elements:
            elements = page.locator("div.event__match").all()
            
        print(f"Found {len(elements)} potential live matches.")
        
        for el in elements[:5]: # LIMIT to first 5 for now to test speed/stability
            id_attr = el.get_attribute("id")
            if id_attr:
                match_ids.append(id_attr.split('_')[-1])
        
        print(f"Scraping IDs: {match_ids}")
        page.close() # Close list page
        
        # 2. Visit Each Match & Listen to WS
        for mid in match_ids:
            print(f"Processing {mid}...")
            match_data = {"id": mid, "stats": {}}
            
            p_match = context.new_page()
            
            # Variable to store captured stats
            captured_stats = {}
            ws_found = False
            
            def handle_ws(ws):
                # print(f"  WS Open: {ws.url}")
                def handle_frame(frame):
                    nonlocal ws_found
                    try:
                        payload = frame
                        if isinstance(frame, bytes):
                            payload = frame.decode('utf-8', errors='ignore')
                            
                        if "eventSummaryOddsStatsUpdate" in payload:
                            ws_found = True
                            # Extract stats
                            new_stats = extract_stats_from_payload(payload)
                            if new_stats:
                                captured_stats.update(new_stats)
                                # print(f"  -> Captured: {new_stats.keys()}")
                    except:
                        pass
                
                ws.on("framereceived", handle_frame)

            p_match.on("websocket", handle_ws)
            
            # Go to stats page specifically
            url = f"https://www.flashscore.es/partido/{mid}/#/resumen-del-partido/estadisticas-del-partido/0"
            try:
                p_match.goto(url, timeout=30000)
                # Wait enough time for WS connection and initial data push
                time.sleep(6) 
            except Exception as e:
                print(f"  Error loading match {mid}: {e}")
            
            if captured_stats:
                match_data["stats"] = captured_stats
                print(f"  [OK] Extracted {len(captured_stats)} stats.")
            else:
                print("  [WARN] No stats captured via WS.")
            
            results.append(match_data)
            p_match.close()
            
        browser.close()
        
    # Save Results
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"Saved {len(results)} matches to {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_flashscore()
