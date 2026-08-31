require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');
const csvParser = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { exec } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Serve the repository root so we can access photos/inbox and photos/original
app.use('/repo', express.static(path.join(__dirname, '..')));

const INBOX_DIR = path.join(__dirname, '..', 'photos', 'inbox');
const CONFIGS_PATH = path.join(__dirname, '..', 'utils', 'configs.json');
const CSV_DIR = path.join(__dirname, '..', 'csv');

// GET /api/config
app.get('/api/config', (req, res) => {
    res.json({ GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '' });
});

// GET /api/inbox
app.get('/api/inbox', async (req, res) => {
    try {
        if (!fs.existsSync(INBOX_DIR)) {
            fs.mkdirSync(INBOX_DIR, { recursive: true });
        }
        
        const files = fs.readdirSync(INBOX_DIR).filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'));
        
        const photoData = [];
        
        for (const file of files) {
            const filePath = path.join(INBOX_DIR, file);
            let metadata = { filename: file, lat: null, lng: null, datetime: null };
            
            try {
                const tags = await ExifReader.load(filePath);
                
                if (tags['DateTimeOriginal']) {
                    const dateStr = tags['DateTimeOriginal'].description; // format: "2023:08:30 15:30:00"
                    if (dateStr) {
                        const parts = dateStr.split(' ');
                        const dateParts = parts[0].split(':');
                        const timeParts = parts[1].split(':');
                        metadata.datetime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], timeParts[2]).getTime();
                    }
                }
                
                if (tags['GPSLatitude'] && tags['GPSLongitude']) {
                    const latRef = tags['GPSLatitudeRef']?.value[0] || 'N';
                    const lngRef = tags['GPSLongitudeRef']?.value[0] || 'E';
                    
                    let lat = tags['GPSLatitude'].description;
                    let lng = tags['GPSLongitude'].description;
                    
                    if (typeof lat === 'number') {
                        metadata.lat = latRef === 'N' ? lat : -lat;
                        metadata.lng = lngRef === 'E' ? lng : -lng;
                    }
                }
            } catch (e) {
                console.error(`Error reading EXIF for ${file}:`, e);
            }
            
            photoData.push(metadata);
        }
        
        // Group photos by time (within 60 seconds)
        photoData.sort((a, b) => (a.datetime || 0) - (b.datetime || 0));
        
        const groups = [];
        let currentGroup = [];
        
        for (const photo of photoData) {
            if (currentGroup.length === 0) {
                currentGroup.push(photo);
            } else {
                const lastPhoto = currentGroup[currentGroup.length - 1];
                if (photo.datetime && lastPhoto.datetime && Math.abs(photo.datetime - lastPhoto.datetime) <= 60000) {
                    currentGroup.push(photo);
                } else {
                    groups.push([...currentGroup]);
                    currentGroup = [photo];
                }
            }
        }
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        
        res.json({ groups });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/geocode?lat=X&lng=Y
app.get('/api/geocode', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Invalid coordinates' });
    
    try {
        const configs = JSON.parse(fs.readFileSync(CONFIGS_PATH, 'utf8'));
        let matchedCity = null;
        let matchedCountry = null;
        
        for (const [key, value] of Object.entries(configs)) {
            const config = value.config;
            if (config.borders && config.country) {
                const { south, north, west, east } = config.borders;
                if (lat >= south && lat <= north && lng >= west && lng <= east) {
                    matchedCity = key;
                    matchedCountry = config.country;
                    break;
                }
            }
        }
        
        res.json({ city: matchedCity, country: matchedCountry });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/check-year?country=X&city=Y&year=Z
app.get('/api/check-year', (req, res) => {
    const { country, city, year } = req.query;
    if (!country || !city || !year) return res.status(400).json({ error: 'Missing params' });
    
    const csvPath = path.join(CSV_DIR, country, `${city}.csv`);
    if (!fs.existsSync(csvPath)) return res.json({ exists: false });
    
    let exists = false;
    fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row) => {
            if (row.year === year) exists = true;
        })
        .on('end', () => {
            res.json({ exists });
        });
});

// POST /api/save
app.post('/api/save', async (req, res) => {
    const { year, lat, lng, city, country, external, notes, widePhoto, closePhoto } = req.body;
    
    if (!year || !lat || !lng || !city || !country || !widePhoto) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const destDir = path.join(__dirname, '..', 'photos', 'original', city);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Move and rename photos
        const wideExt = path.extname(widePhoto) || '.jpg';
        const destWide = path.join(destDir, `${year}${wideExt}`);
        fs.renameSync(path.join(INBOX_DIR, widePhoto), destWide);
        
        if (closePhoto) {
            const closeExt = path.extname(closePhoto) || '.jpg';
            const destClose = path.join(destDir, `${year}_close${closeExt}`);
            fs.renameSync(path.join(INBOX_DIR, closePhoto), destClose);
        }
        
        // Update CSV
        const csvPath = path.join(CSV_DIR, country, `${city}.csv`);
        const newRow = { year, latitude: lat, longitude: lng, notes: notes || '', external: external || '' };
        
        let rows = [];
        let headers = ['year', 'latitude', 'longitude', 'notes', 'external'];
        
        if (fs.existsSync(csvPath)) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(csvPath)
                    .pipe(csvParser())
                    .on('data', (row) => {
                        // if overriding, replace the row
                        if (row.year === year) {
                            rows.push(newRow);
                        } else {
                            rows.push(row);
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
            // If year was not found, append it
            if (!rows.find(r => r.year === year)) {
                rows.push(newRow);
            }
            // Sort by year
            rows.sort((a, b) => parseInt(a.year) - parseInt(b.year));
            
            const csvWriter = createCsvWriter({
                path: csvPath,
                header: headers.map(h => ({id: h, title: h}))
            });
            await csvWriter.writeRecords(rows);
            
        } else {
            const csvDirCountry = path.join(CSV_DIR, country);
            if (!fs.existsSync(csvDirCountry)) fs.mkdirSync(csvDirCountry, { recursive: true });
            
            const csvWriter = createCsvWriter({
                path: csvPath,
                header: headers.map(h => ({id: h, title: h}))
            });
            await csvWriter.writeRecords([newRow]);
        }
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/publish
app.post('/api/publish', (req, res) => {
    const publishScript = path.join(__dirname, 'publish.sh');
    const child = exec(`bash ${publishScript}`, { cwd: path.join(__dirname, '..') });
    
    let output = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => output += data);
    
    child.on('close', code => {
        if (code === 0) res.json({ success: true, output });
        else res.status(500).json({ error: 'Publish failed', output });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Admin UI running on http://localhost:${PORT}`);
});
