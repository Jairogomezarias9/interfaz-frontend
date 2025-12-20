from playwright.sync_api import sync_playwright
import json

EVENT_ID = 15235991  # Paraguay U20 vs Chile U20
URL = f"https://api.sofascore.com/api/v1/event/{EVENT_ID}/incidents"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    
    print(f"Fetching {URL}...")
    try:
        # Prime cookies
        page.goto("https://www.sofascore.com", timeout=30000)
        
        response = page.request.get(URL)
        print(f"Status: {response.status}")
        
        if response.status == 200:
            data = response.json()
            with open("debug_raw_stats.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print("Saved raw JSON to debug_raw_stats.json")
        else:
            print("Failed to fetch.")
            
    except Exception as e:
        print(e)
    
    browser.close()
