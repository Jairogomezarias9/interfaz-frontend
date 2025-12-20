from scraper_365scores import scrape_365scores
import logging

# Configure logging to show everything on console
logging.basicConfig(level=logging.DEBUG)

print("--- MANUAL TEST 365SCORES START ---")
try:
    scrape_365scores()
    print("--- MANUAL TEST 365SCORES COMPLETED SUCCESSFULLY ---")
except Exception as e:
    print(f"--- MANUAL TEST FAILED: {e} ---")
