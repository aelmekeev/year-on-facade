const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function generatePrDescription() {
    try {
        // Get diff of csv directory (staged to include newly added/untracked files)
        const diffOutput = execSync('git diff --staged --no-color csv/').toString();
        
        const addedLines = [];
        const deletedRows = new Map();

        const lines = diffOutput.split('\n');
        
        let currentFile = '';
        for (const line of lines) {
            if (line.startsWith('+++ b/')) {
                currentFile = line.substring(6);
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                const cleanLine = line.substring(1).trimEnd();
                const parts = cleanLine.split(',');
                if (parts[0] && parts[0].match(/^\d{4}$/)) {
                    deletedRows.set(parts[0], {
                        fullLine: cleanLine,
                        isTodo: parts[3] === 'TODO',
                        external: parts[4]
                    });
                }
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                const cleanLine = line.substring(1).trimEnd();
                const parts = cleanLine.split(',');
                if (parts[0] && parts[0].match(/^\d{4}$/)) {
                    addedLines.push({
                        file: currentFile,
                        year: parts[0],
                        lat: parts[1],
                        lng: parts[2],
                        notes: parts[3],
                        external: parts[4],
                        fullLine: cleanLine
                    });
                }
            }
        }

        const trueAddedLines = [];
        for (const item of addedLines) {
            const deleted = deletedRows.get(item.year);
            if (deleted) {
                if (deleted.fullLine === item.fullLine) {
                    // Exact same data (likely a CRLF or sorting diff). Ignore.
                    continue;
                }
                // Data changed
                item.isReplacement = true;
                item.oldExternal = deleted.external;
                item.oldIsTodo = deleted.isTodo;
                trueAddedLines.push(item);
            } else {
                // Brand new addition
                item.isReplacement = false;
                trueAddedLines.push(item);
            }
        }

        if (trueAddedLines.length === 0) {
            console.log("No new buildings found in csv diff.");
            fs.writeFileSync('pr-body.txt', 'Added new buildings/photos.');
            return;
        }

        let body = 'The following locations were added:\n\n';

        const grouped = {};
        for (const item of trueAddedLines) {
            if (!grouped[item.file]) {
                grouped[item.file] = [];
            }
            grouped[item.file].push(item);
        }

        for (const [file, items] of Object.entries(grouped)) {
            let header = file;
            if (file.endsWith('.csv')) {
                const parts = file.substring(0, file.length - 4).split('/');
                if (parts.length >= 2) {
                    const city = parts.pop();
                    const country = parts.pop();
                    header = `${country} - ${city}`;
                }
            }
            body += `### ${header}\n\n`;

            for (const item of items) {
                const gsvLink = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${item.lat},${item.lng}`;
                
                body += `* ${item.year}: [Google Street View](${gsvLink})\n`;
                
                if (item.isReplacement) {
                    if (item.oldIsTodo && item.oldExternal === item.external) {
                        // No note if we just fulfilled a TODO and kept the same external ID
                    } else if (!item.external) {
                        body += `  * replaced since it leads to better points distribution\n`;
                    } else if (!item.oldExternal && item.external) {
                        body += `  * replaced since it is listed in heritage registry\n`;
                    } else {
                        // fallback if both have external, just output heritage registry
                        body += `  * replaced since it is listed in heritage registry\n`;
                    }
                }
            }
            body += '\n';
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
