const fs = require('fs');
const files = ['absensi.js', 'Kode.gs'];
const queries = ['google.script.run', 'fetch', 'waktu', 'jam', 'date', 'new date'];
let out = '';

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        out += `\n--- Searching in ${file} ---\n`;
        lines.forEach((line, i) => {
            const lower = line.toLowerCase();
            queries.forEach(q => {
                if (lower.includes(q)) {
                    out += `[${q}] ${file}:${i+1} : ${line.trim()}\n`;
                }
            });
        });
    } catch(e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});
fs.writeFileSync('search_results.txt', out, 'utf8');
