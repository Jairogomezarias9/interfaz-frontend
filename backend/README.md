# Backend Scraper

This backend scrapes live football data from Tonybet and serves it via a local API.

## Setup

1.  Install Python (if not already installed).
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Install Playwright browsers:
    ```bash
    playwright install
    ```

## Running the Server

Run the following command in this directory:

```bash
python main.py
```

The API will be available at `http://localhost:8000/api/odds`.

## Notes

-   The scraper uses a headless browser to fetch data.
-   It attempts to parse the page structure dynamically. If the website structure changes, the scraper might need adjustments in `scraper.py`.
