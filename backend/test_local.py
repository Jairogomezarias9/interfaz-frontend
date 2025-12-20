from scraper import scrape_tonybet
import json

print("Starting local test of scrape_tonybet...")
try:
    data = scrape_tonybet()
    print(f"Scrape complete. Found {len(data)} matches.")
    
    if data:
        # Print the first match details to check odds
        first_match = data[0]
        print("\nSample Match Data:")
        print(json.dumps(first_match, indent=2, default=str))
        
        # Check specifically for odds
        odds_keys = [k for k in first_match.keys() if 'odds' in k]
        found_odds = {k: first_match[k] for k in odds_keys if first_match[k] is not None}
        
        print(f"\nFound {len(found_odds)} odds markets in the first match.")
        if found_odds:
            print("Odds found:", found_odds)
        else:
            print("WARNING: No odds values found (all None).")
            
    else:
        print("No matches found.")

except Exception as e:
    print(f"Error running scraper: {e}")
