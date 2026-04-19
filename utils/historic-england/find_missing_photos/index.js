const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const prompt = require('prompt-sync')({ sigint: true });

puppeteer.use(StealthPlugin());

const CSV_DIR = path.join(__dirname, '../../../csv/UK/');
const OUTPUT_FILE = path.join(__dirname, 'missing_photos.csv');

async function getCandidates() {
  const candidates = [];
  if (!fs.existsSync(CSV_DIR)) {
    console.error(`CSV directory not found: ${CSV_DIR}`);
    return candidates;
  }

  const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));

  for (const file of files) {
    const region = path.parse(file).name;
    const filePath = path.join(CSV_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const records = parse(content, {
      columns: false,
      skip_empty_lines: true
    });

    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length >= 5) {
        const year = row[0];
        const notes = row[row.length - 2];
        const he_id = row[row.length - 1];

        if (notes && notes.trim().toUpperCase() === 'TODO') {
          continue;
        }

        if (he_id && he_id.trim().length > 0) {
          candidates.push({ region, year, he_id: he_id.trim() });
        }
      }
    }
  }
  return candidates;
}

async function scrapeMissingPhotos(candidates) {
  console.log(`Starting scrape for ${candidates.length} candidates...`);

  // Launch Puppeteer with Stealth plugin
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  if (!fs.existsSync(OUTPUT_FILE)) {
    fs.writeFileSync(OUTPUT_FILE, 'region,year,he_id\n', 'utf-8');
  }

  for (let i = 0; i < candidates.length; i++) {
    const { region, year, he_id } = candidates[i];
    const url = `https://historicengland.org.uk/listing/the-list/list-entry/${he_id}?section=comments-and-photos`;
    
    console.log(`[${i + 1}/${candidates.length}] Checking ${he_id}...`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Give CF verification time to process automatically
      await new Promise(r => setTimeout(r, 4000));

      let title = await page.title();
      while (title.toLowerCase().includes('just a moment') || title.toLowerCase().includes('cloudflare')) {
        process.stdout.write('\x07');
        console.log(`\n--- CLOUDFLARE CHALLENGE DETECTED ---`);
        console.log(`Page: ${url}`);
        prompt('Please solve the challenge in the browser window, then press ENTER to continue script...');
        
        await new Promise(r => setTimeout(r, 2000));
        title = await page.title();
      }

      // Extract body text
      const pageText = await page.evaluate(() => document.body.innerText);
      
      if (pageText.includes('There are 0 comments')) {
        console.log(`  -> No photos found for ${he_id}`);
        fs.appendFileSync(OUTPUT_FILE, `${region},${year},${he_id}\n`, 'utf-8');
      } else {
        console.log(`  -> Photos found (or '0 comments' missing) for ${he_id}`);
      }

      await new Promise(r => setTimeout(r, 3000));

    } catch (e) {
      console.error(`  -> Error checking ${he_id}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
}

(async () => {
  const candidates = await getCandidates();
  if (candidates.length === 0) {
    console.log('No valid candidates found to check.');
    return;
  }
  await scrapeMissingPhotos(candidates);
})();
