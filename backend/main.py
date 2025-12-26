import difflib
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from scraper import scrape_tonybet
from prematch_scraper import scrape_tonybet_prematch
from scraper_fast import scrape_tonybet_fast
from scrapper_oriol import scrape_tonybet_oriol # [NEW IMPORT]
from scraper_365scores import scrape_365scores
import uvicorn
import threading
import time
import os
import subprocess
import re

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/debug", StaticFiles(directory="."), name="debug")


# Static files for debug only (optional)
app.mount("/debug", StaticFiles(directory="."), name="debug")


@app.get("/")
def read_root():
    return {"message": "Betly API is running", "endpoints": ["/api/odds", "/api/prematch-odds", "/api/fast-odds", "/api/oriol-odds"]}

@app.get("/favicon.ico")
def favicon():
    return {"message": "No favicon"}

# Global cache to store matches
matches_cache = []
cache_lock = threading.Lock()
is_scraping = False

# Prematch Cache
prematch_cache = []
prematch_lock = threading.Lock()
is_scraping_prematch = False

# Fast Live Cache
fast_cache = []
fast_lock = threading.Lock()
is_scraping_fast = False

# [NEW] Oriol Cache
oriol_cache = []
oriol_lock = threading.Lock()
is_scraping_oriol = False

# --- STATS UNIFIER ---
STATS_FILE = "365scores_live.json"
stats_cache = []
last_stats_update = 0

def load_365_stats():
    global stats_cache, last_stats_update
    try:
        if os.path.exists(STATS_FILE):
            # Check modification time to reload
            mtime = os.path.getmtime(STATS_FILE)
            if mtime > last_stats_update:
                with open(STATS_FILE, 'r', encoding='utf-8') as f:
                    stats_cache = json.load(f)
                last_stats_update = mtime
                # print(f"[Stats] Loaded {len(stats_cache)} stats records.")
    except Exception as e:
        print(f"[Stats] Error loading stats: {e}")

def normalize_name(name):
    if not name: return ""
    name = name.lower()
    # Remove common suffixes/prefixes
    replacements = [" fc", "fc ", "fk ", " u21", " u20", " u19", "ca ", " cd", "cf ", " sc", " women", " (w)"]
    for r in replacements:
        name = name.replace(r, "")
    return name.strip()

def merge_stats_with_fast(matches):
    # Ensure fresh stats
    load_365_stats()
    
    if not stats_cache:
        return matches

    for m in matches:
        # Match Logic:
        # 1. Match BOTH Home and Away names
        # 2. Avg score must be high (> 0.60)
        
        home_fast = normalize_name(m.get('home_team', ''))
        away_fast = normalize_name(m.get('away_team', ''))
        
        best_score = 0
        best_match = None
        
        for s in stats_cache:
            home_365 = normalize_name(s.get('homeTeam', ''))
            away_365 = normalize_name(s.get('awayTeam', ''))
            
            # Use SequenceMatcher for both
            ratio_home = difflib.SequenceMatcher(None, home_fast, home_365).ratio()
            ratio_away = difflib.SequenceMatcher(None, away_fast, away_365).ratio()
            
            avg_ratio = (ratio_home + ratio_away) / 2
            
            if avg_ratio > best_score:
                best_score = avg_ratio
                best_match = s
        
        # Threshold - Needs to be reasonably high to avoid false positives (e.g. U19 vs Main)
        # But flexible enough for "Man City" vs "Manchester City"
        if best_score > 0.65: 
            m['stats_365'] = best_match['stats']
            # print(f"Matched {m['home_team']} vs {m['away_team']} <-> {best_match['homeTeam']} vs {best_match['awayTeam']} ({best_score:.2f})")
        else:
            m['stats_365'] = None
            
    return matches


def background_scraper():
    global matches_cache, is_scraping
    while True:
        try:
            print("\n[Background] Starting new scrape cycle...")
            is_scraping = True
            start_time = time.time()
            
            # Run the scraper
            new_data = scrape_tonybet()
            
            # Update cache if we got data
            if new_data:
                with cache_lock:
                    matches_cache = new_data
                print(f"[Background] Cache updated with {len(new_data)} matches.")
            else:
                print("[Background] No data found in this cycle.")
                
            duration = time.time() - start_time
            print(f"[Background] Cycle finished in {duration:.2f} seconds.")
            
        except Exception as e:
            print(f"[Background] Error in scraper loop: {e}")
        finally:
            is_scraping = False
            
        # Wait 1 hour before next update
        print("[Background] Waiting 1 hour before next update...")
        time.sleep(3600)

def background_scraper_prematch():
    global prematch_cache, is_scraping_prematch
    while True:
        try:
            print("\n[Background Prematch] Starting new scrape cycle...")
            is_scraping_prematch = True
            start_time = time.time()
            
            # Run the scraper
            new_data = scrape_tonybet_prematch()
            
            # Update cache if we got data
            if new_data:
                with prematch_lock:
                    prematch_cache = new_data
                print(f"[Background Prematch] Cache updated with {len(new_data)} matches.")
            else:
                print("[Background Prematch] No data found in this cycle.")
                
            duration = time.time() - start_time
            print(f"[Background Prematch] Cycle finished in {duration:.2f} seconds.")
            
        except Exception as e:
            print(f"[Background Prematch] Error in scraper loop: {e}")
        finally:
            is_scraping_prematch = False
            
        # Wait 4 hours before next update (less frequent)
        print("[Background Prematch] Waiting 4 hours before next update...")
        time.sleep(14400)

def background_scraper_fast():
    global fast_cache, is_scraping_fast
    while True:
        try:
            print("\n[Background Fast] Starting new scrape cycle...")
            is_scraping_fast = True
            start_time = time.time()
            
            # Run the scraper
            new_data = scrape_tonybet_fast()
            
            # Update cache if we got data
            if new_data:
                with fast_lock:
                    fast_cache = new_data
                print(f"[Background Fast] Cache updated with {len(new_data)} matches.")
                
                # Trigger 365scores scraper update too? 
                # Ideally yes, but let's keep it decoupled for now.
                
            else:
                print("[Background Fast] No data found in this cycle.")
                
            duration = time.time() - start_time
            print(f"[Background Fast] Cycle finished in {duration:.2f} seconds.")
            
        except Exception as e:
            print(f"[Background Fast] Error in scraper loop: {e}")
        finally:
            is_scraping_fast = False
            
        # Wait 10 minutes before next update (CPU friendly)
        print("[Background Fast] Waiting 2 minutes before next update...")
        time.sleep(120)

# [NEW] Background Scraper Oriol
def background_scraper_oriol():
    global oriol_cache, is_scraping_oriol
    while True:
        try:
            print("\n[Background Oriol] Starting new scrape cycle (FULL ODDS)...")
            is_scraping_oriol = True
            start_time = time.time()
            
            # Run the scraper
            new_data = scrape_tonybet_oriol()
            
            # Update cache if we got data
            if new_data:
                with oriol_lock:
                    oriol_cache = new_data
                print(f"[Background Oriol] Cache updated with {len(new_data)} matches.")
            else:
                print("[Background Oriol] No data found in this cycle.")
                
            duration = time.time() - start_time
            print(f"[Background Oriol] Cycle finished in {duration:.2f} seconds.")
            
        except Exception as e:
            print(f"[Background Oriol] Error in scraper loop: {e}")
        finally:
            is_scraping_oriol = False
            
        # Wait 2 minutes before next update
        print("[Background Oriol] Waiting 8000 seconds before next update...")
        time.sleep(8000)

def background_scraper_365():
    global is_scraping_365
    while True:
        try:
            print("\n[Background 365] Starting new scrape cycle...")
            is_scraping_365 = True
            start_time = time.time()
            
            # Run the scraper
            scrape_365scores()
            
            # Trigger reload in memory logic implicitly by updating file timestamp
            
            duration = time.time() - start_time
            print(f"[Background 365] Cycle finished in {duration:.2f} seconds.")
            
        except Exception as e:
            print(f"[Background 365] Error in scraper loop: {e}")
        finally:
            is_scraping_365 = False
            
        # Wait 30 seconds (Live stats need to be kinda fresh)
        print("[Background 365] Waiting 2 minutes before next update...")
        time.sleep(120)


@app.on_event("startup")
def startup_event():
    # Read configuration from environment variable
    # Options: "LIVE", "PREMATCH", "FAST", "BOTH" (Live+Prematch), "ALL", "ORIOL", "FAST_ORIOL"
    # User requested: scraper_365, scraper_fast, scrapper_oriol -> FAST_ORIOL
    scraper_mode = os.getenv("SCRAPER_MODE", "FAST_ORIOL").upper().strip()
    print(f"Starting server with SCRAPER_MODE={scraper_mode}")
    print(f"DEBUG MODE VALUE: {repr(scraper_mode)}")

    # DEBUG: Print registered routes
    print("--- Registered Routes ---")
    for route in app.routes:
        print(f"Path: {route.path}")
    print("-------------------------")

    if scraper_mode in ["LIVE", "BOTH", "ALL"]:
        # Start the scraper in a background thread
        thread = threading.Thread(target=background_scraper, daemon=True)
        thread.start()
        print("Live scraper background thread started.")
    
    if scraper_mode in ["PREMATCH", "BOTH", "ALL"]:
        # Start the prematch scraper in a separate background thread
        thread_prematch = threading.Thread(target=background_scraper_prematch, daemon=True)
        thread_prematch.start()
        print("Prematch scraper background thread started.")

    if scraper_mode in ["FAST", "ALL", "FAST_ORIOL"]:
        # Start the fast scraper in a separate background thread
        thread_fast = threading.Thread(target=background_scraper_fast, daemon=True)
        thread_fast.start()
        print("Fast scraper background thread started.")
        
        # Start 365 scraper alongside FAST (or independently if we had a flag)
        # Assuming FAST mode wants stats too.
        thread_365 = threading.Thread(target=background_scraper_365, daemon=True)
        thread_365.start()
        print("365Scores scraper background thread started.")
    
    # [NEW] STart Oriol Scraper if mode is ALL or ORIOL or FAST_ORIOL
    if scraper_mode in ["ALL", "ORIOL", "FAST_ORIOL"]:
        thread_oriol = threading.Thread(target=background_scraper_oriol, daemon=True)
        thread_oriol.start()
        print("Oriol scraper (Full Odds) background thread started.")

@app.get("/api/odds")
def get_odds():
    with cache_lock:
        # Return cached data immediately
        # Also return a status flag so frontend knows if it's fresh or initial loading
        return {
            "matches": matches_cache,
            "count": len(matches_cache),
            "status": "scraping" if is_scraping and not matches_cache else "ready"
        }

@app.get("/api/prematch-odds")
def get_prematch_odds():
    with prematch_lock:
        return {
            "matches": prematch_cache,
            "count": len(prematch_cache),
            "status": "scraping" if is_scraping_prematch and not prematch_cache else "ready"
        }

@app.get("/api/fast-odds")
def get_fast_odds():
    with fast_lock:
        # Create a copy to avoid modifying cache in place or race conditions
        # although verifying file existence is fast, better to do it on the fly
        matches_copy = list(fast_cache)
        
        # MERGE STATS
        matches_merged = merge_stats_with_fast(matches_copy)
        
        return {
            "matches": matches_merged,
            "count": len(matches_merged),
            "status": "scraping" if is_scraping_fast and not fast_cache else "ready"
        }

# [NEW] Endpoint for Oriol Odds
@app.get("/api/oriol-odds")
def get_oriol_odds():
    with oriol_lock:
        # Inject sequential ID2 PER LEAGUE for URL routing (1, 2, 3... for EACH league)
        matches_with_id = []
        league_counters = {}

        for match in oriol_cache:
            m_copy = match.copy()
            
            # Determine League Key (Consistency is key)
            # Use league_header name if available, else tournament name
            league_name = "unknown"
            if m_copy.get('league_header') and m_copy['league_header'].get('name'):
                 league_name = m_copy['league_header']['name']
            elif m_copy.get('tournament') and m_copy['tournament'].get('name'):
                 league_name = m_copy['tournament']['name']
            
            # Normalize for key usage (optional but safer)
            league_key = league_name.strip().lower() # Simple normalization

            # Initialize counter if new league
            if league_key not in league_counters:
                league_counters[league_key] = 1
            
            # Assign ID and increment
            m_copy['id2'] = league_counters[league_key]
            league_counters[league_key] += 1
            
            matches_with_id.append(m_copy)

        return {
            "matches": matches_with_id,
            "count": len(matches_with_id),
            "status": "scraping" if is_scraping_oriol and not oriol_cache else "ready"
        }

if __name__ == "__main__":
    # Use 0.0.0.0 to make it accessible externally (e.g. on a VPS)
    # Changed port to 8001 to avoid conflict with existing service on 8000
    uvicorn.run(app, host="0.0.0.0", port=8001)
