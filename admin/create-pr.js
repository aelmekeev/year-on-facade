const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function generatePrDescription() {
    try {
        // Get diff of csv directory
        const diffOutput = execSync('git diff --no-color csv/').toString();
        
        const addedLines = [];
        const deletedYears = new Set();

        const lines = diffOutput.split('\n');
        
        let currentFile = '';
        for (const line of lines) {
            if (line.startsWith('+++ b/')) {
                currentFile = line.substring(6);
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                const parts = line.substring(1).split(',');
                if (parts[0] && parts[0].match(/^\d{4}$/)) {
                    deletedYears.add(parts[0]);
                }
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                const parts = line.substring(1).split(',');
                if (parts[0] && parts[0].match(/^\d{4}$/)) {
                    addedLines.push({
                        file: currentFile,
                        year: parts[0],
                        lat: parts[1],
                        lng: parts[2],
                        notes: parts[3],
                        external: parts[4]
                    });
                }
            }
        }

        if (addedLines.length === 0) {
            console.log("No new buildings found in csv diff.");
            fs.writeFileSync('pr-body.txt', 'Added new buildings/photos.');
            return;
        }

        let body = 'The following locations were added:\n\n';

        for (const item of addedLines) {
            const isReplacement = deletedYears.has(item.year);
            const gsvLink = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${item.lat},${item.lng}`;
            
            body += `* ${item.year}: [Google Street View](${gsvLink})\n`;
            
            if (isReplacement) {
                if (item.external) {
                    body += `  * replaced since it is listed in heritage registry\n`;
                } else {
                    body += `  * replaced since it leads to better points distribution\n`;
                }
            }
        }

        fs.writeFileSync('pr-body.txt', body);
        console.log("PR description generated in pr-body.txt");

    } catch (e) {
        console.error("Error generating PR description:", e);
        // Fallback
        fs.writeFileSync('pr-body.txt', 'Added new buildings.\n');
    }
}

generatePrDescription();
