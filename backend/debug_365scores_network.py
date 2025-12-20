from playwright.sync_api import sync_playwright
import time
import json

def run_sniffer():
    print("Starting 365Scores Network Sniffer...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        # Listener
        def handle_response(response):
            try:
                # Log any request related to the specific game ID seen in logs (4546792)
                # Or generic stats endpoints
                url = response.url
                if "4546792" in url or "game" in url:
                    # Filter out assets
                    if response.request.resource_type in ["image", "font", "media", "stylesheet"]:
                        return
                        
                    print(f"\n[POTENTIAL API] {url}")
                    print(f"Type: {response.headers.get('content-type', 'unknown')}")
                    try:
                        text = response.text()
                        if len(text) < 1000:
                            print(f"Snippet: {text}...")
                        else:
                            print(f"Snippet: {text[:200]}...")
                            
                        if "Total Remates" in text:
                            print("[!!!] Found exact payload match here!")
                    except:
                        pass
            except:
                pass

        page.on("response", handle_response)

        print("Navigating to 365Scores Live...")
        page.goto("https://www.365scores.com/es/football/live", timeout=60000)
        
        try:
            page.get_by_text("Acepto", exact=True).click(timeout=5000)
        except: pass

        # Find a match row and click it to ensure details load
        # Selector for match row usually involves a link or div class
        print("Looking for a match...")
        try:
            # Try to click the first match row container
            # 365Scores match rows have complex classes. 
            # Often `a[href*="/game/"]` or similar.
            match_link = page.locator("a[href*='/football/match/']").first
            if match_link.is_visible():
                print(f"Clicking match: {match_link.get_attribute('href')}")
                match_link.click()
                time.sleep(5) # Wait for details to load
            else:
                print("No specific match link found using regular selector.")
        except Exception as e:
            print(f"Interaction error: {e}")
            
        page.screenshot(path="debug_365.png")
        print("Saved screenshot to debug_365.png")

        # Wait a bit more for background XHRs
        time.sleep(10)
        
        browser.close()

if __name__ == "__main__":
    run_sniffer()
