# Historic England Missing Photos Script

The scraping script to find missing photos has been successfully created.

[Google Sheets template](https://docs.google.com/spreadsheets/d/1Pk6QTnH5PldGdh-nBJEA3eCAwmvHF0VK00_ls_UigR0/edit?gid=0#gid=0).

## Implementation Details
- **Dependencies:** `playwright` for browser automation, `csv-parse` for parsing your existing CSVs, and `prompt-sync` for user interaction.
- **Logic:** 
  - The script iterates through your county CSVs in `csv/UK/*.csv`.
  - It filters out buildings marked as `TODO` or without a Historic England Entry ID.
  - It launches a visible Chrome browser and navigates to the *Comments and Photos* tab for each valid entry.
  - If a Cloudflare "Just a moment" challenge appears, the script will sound an alert beep in your terminal and pause execution indefinitely. You can solve the captcha in the opened browser window, then press `Enter` in the terminal to resume the script.
  - The script searches the page text for "There are 0 comments".
  - Results are appended live to `utils/historic-england/find_missing_photos/missing_photos.csv`.

## How to Run the Script

Open your terminal, navigate to the script directory, and run the script:

```bash
cd ./utils/historic-england/find_missing_photos
node index.js
```

### Important Tips
1. Keep the browser window that Playwright opens visible on your screen, at least initially.
2. Ensure your terminal window is also visible so you can see when it pauses and prompts you for input.
3. Once the first Cloudflare challenge is solved, the browser's session is typically trusted for the duration of the script, meaning subsequent pages should load automatically.
4. Output is continuously written to `missing_photos.csv`, so you can stop the script at any time without losing data.
