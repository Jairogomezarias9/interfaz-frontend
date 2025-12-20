from playwright.sync_api import sync_playwright
import time
import json

def run_sniffer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True) # Use headless=False if you want to see
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        print("Navigating to FlashScore.es (Live)...")
        page.goto("https://www.flashscore.es/futbol/", timeout=60000)
        
        # 1. Accept Cookies (if any)
        try:
            page.get_by_id("onetrust-accept-btn-handler").click(timeout=5000)
            print("Accepted cookies.")
        except:
            pass

        # 2. Click "DIRECTO" tab to ensure we see live games
        try:
            # The selector for "Live" tab often changes, looking for text "En Directo" or similar
            page.locator("div.filters__tab:has-text('Directo')").click(timeout=5000)
            print("Clicked 'Directo' tab.")
            time.sleep(2)
        except Exception as e:
            print(f"Could not click Directo: {e}")

        # 3. Find a match ID
        # FlashScore IDs are usually in the id attribute of div.event__match like "g_1_ABcDeF"
        match_element = page.locator("div.event__match--live").first
        if not match_element.is_visible():
            print("No live matches found visible. Trying any match...")
            match_element = page.locator("div.event__match").first
        
        match_id_attr = match_element.get_attribute("id")
        if not match_id_attr:
            print("Could not find match ID.")
            browser.close()
            return

        # usage: g_1_MatchID -> MatchID
        match_id = match_id_attr.split('_')[-1]
        print(f"Found Match ID: {match_id}")

        # 4. Open Match Detail Page to trigger stats feed
        detail_url = f"https://www.flashscore.es/partido/{match_id}/#/resumen-del-partido/estadisticas-del-partido/0"
        print(f"Opening details: {detail_url}")

        # Setup listener BEFORE navigating
        def handle_response(response):
            try:
                # We are looking for ANY traffic that might contain the payload
                # FlashScore payloads almost always contain the section delimiter ~SE
                
                # Filter out obvious non-candidates (images, css, etc.)
                resource_type = response.request.resource_type
                if resource_type in ["image", "stylesheet", "font", "media"]:
                    return

                try:
                    text = response.text()
                    if "~SE÷" in text:
                        print(f"\n[SUCCESS] Found Feed URL: {response.url}")
                        print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
                        print(f"Snippet: {text[:200]}...")
                except:
                    # Some responses (like binary) fail .text()
                    pass
            except Exception as e:
                # print(f"Error checking response: {e}")
                pass

        # 4. Probe known Feed Endpoints
        print(f"Match ID: {match_id}. Probing Feed Endpoints...")
        
        endpoints = [
            f"https://local-es.flashscore.ninja/x/feed/df_sui_1_{match_id}",
            f"https://global.flashscore.ninja/x/feed/df_sui_1_{match_id}",
            f"https://46.flashscore.ninja/x/feed/df_sui_1_{match_id}",
            f"https://d.flashscore.es/x/feed/df_sui_1_{match_id}"
        ]
        
        found_data = False
        
        # Setup WS listener
        def handle_ws(ws):
            print(f"WebSocket opened: {ws.url}")
            def handle_frame(frame):
                try:
                    # In sync_playwright, frame IS the string payload (usually)
                    payload = frame 
                    if isinstance(payload, bytes):
                        payload = payload.decode('utf-8', errors='ignore')
                        
                    if payload and len(payload) > 10:
                        # Safely print payload using repr to avoid encoding issues
                        safe_payload = repr(payload[:500])
                        print(f"\n[WS DATA] {ws.url}")
                        print(f"Payload: {safe_payload}...")
                except Exception as e:
                    print(f"WS Error: {e}")
            
            ws.on("framesent", handle_frame)
            ws.on("framereceived", handle_frame)

        page.on("websocket", handle_ws)
        # page.on("response", handle_response) # Disable HTTP listener to reduce noise

        page.goto(detail_url, timeout=60000)
        
        # Wait for stats to load
        print("Waiting for stats to load...")
        time.sleep(15)
        
        page.screenshot(path="debug_flashscore.png")
        print("Saved screenshot to debug_flashscore.png")
        
        browser.close()

if __name__ == "__main__":
    run_sniffer()
