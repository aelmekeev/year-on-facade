# Extract Visited Sites Missing Photos on Historic England

This plan outlines the creation of a Node.js script to identify Historic England entries you have visited (and have photos for), but which currently lack user-contributed photos on the Historic England website.

## Background Context
You maintain a collection of CSV files per county under `csv/UK/*.csv`. 
Each row represents a building/facade. 
- The first column is the `year`.
- The second-to-last column indicates status (`TODO` means unvisited).
- The very last column contains the `Historic England Entry ID` (if applicable).

The goal is to produce a list of `<region>, <year>, <entry_id>` for sites that:
1. Have been visited (i.e., second-to-last column is NOT `TODO`).
2. Have a Historic England Entry ID.
3. **Do not** currently have any photos on their Historic England "Comments and Photos" page (indicated by the text "There are 0 comments").

## User Review Required
None for this iteration, plan is updated based on your feedback. 
*(Note: Since you are using Node.js, we will use Playwright. I noticed earlier that your Node version is 16.10.0, but modern Playwright requires Node 18+. The plan assumes you are fine with updating Node or using `nvm` to run the script. Alternatively, we can use Puppeteer which has similar capabilities.)*

## Proposed Changes

### `utils/historic-england/find_missing_photos/` (New Directory)
We will create a new directory for the script and its dependencies.

#### [NEW] `utils/historic-england/find_missing_photos/package.json`
- Initialize a basic Node.js package.
- Add dependencies: `playwright`, `csv-parse` (for parsing CSVs), and `prompt-sync` (to wait for user input if a Cloudflare challenge appears).

#### [NEW] `utils/historic-england/find_missing_photos/index.js`
- **CSV Parsing Phase:**
  - Use Node's `fs` and `path` to find all `../../../csv/UK/*.csv` files.
  - Read and parse each file using `csv-parse`. The `<region>` will be derived from the filename (e.g., `Devon` from `Devon.csv`).
  - Filter valid candidates: check the second-to-last column (not `"TODO"`) and the last column (not empty).
  - Store valid candidates in an array.
  
- **Scraping Phase:**
  - Launch Playwright Chromium in **headed mode** (`headless: false`).
  - Iterate through the candidate list.
  - For each `he_id`, navigate to `https://historicengland.org.uk/listing/the-list/list-entry/{he_id}?section=comments-and-photos`.
  - **Cloudflare Challenge Handling:** After navigation, check the page title. If it includes "Just a moment..." or "Cloudflare", the script will sound a bell (`\x07`) and pause, displaying a prompt in the terminal: `"Cloudflare challenge detected. Please solve it in the browser, then press Enter to continue..."`.
  - Once the page is loaded (or the challenge is cleared), check the page content for the text `"There are 0 comments"`.
  - If the text is found (meaning no photos), append the `<region>,<year>,<he_id>` row to a results CSV file (e.g., `missing_photos.csv`).
  - Add a `await page.waitForTimeout(3000)` (3 seconds) delay between checks to avoid rate limits.

## Verification Plan
### Automated Tests
- N/A for this script.

### Manual Verification
1. I will provide the commands to navigate to the new folder, run `npm install`, and install Playwright browsers (`npx playwright install chromium`).
2. Run the script `node index.js`.
3. Verify the browser opens, navigates to the first few Historic England URLs, correctly identifies whether photos are present, prompts you when Cloudflare intervenes, and outputs the expected comma-separated list into a CSV file.
