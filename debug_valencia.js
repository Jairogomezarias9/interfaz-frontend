
const fs = require('fs');
const path = require('path');

// --- Helper from download_logos.js ---
const cleanName = (original) => {
    if (!original) return "";
    let clean = original;

    // Normalize
    clean = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // City Maps (Simplified for this test, Valencia is not in the map anyway)

    // Strip Youth/Reserve prefixes/suffixes
    clean = clean.replace(/\bU19\b/g, '').trim();
    clean = clean.replace(/\bU21\b/g, '').trim();
    clean = clean.replace(/\bU23\b/g, '').trim();

    // Strip common prefixes/suffixes
    clean = clean.replace(/\b(FC|CF|SC|AS|AC|CD|SV|SK|FK|NK|EC|W|RC|SD|UD|CA|CS|AD)\b/g, '').trim();

    // Specific fixers
    if (clean.includes("Deportivo La Coru")) return "Deportivo";


    return clean.trim();
};

const LOCAL_DB_PATH = path.join(__dirname, 'soccer_wiki_logos.json');

const test = () => {
    const inputName = "U19 CF Valencia";
    console.log(`Input: "${inputName}"`);

    const cleanedInput = cleanName(inputName);
    console.log(`Cleaned Input: "${cleanedInput}"`);

    if (!fs.existsSync(LOCAL_DB_PATH)) {
        console.error("JSON not found at", LOCAL_DB_PATH);
        return;
    }

    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    const json = JSON.parse(raw);
    const localDb = json.ClubData;

    console.log(`Loaded ${localDb.length} clubs.`);

    // Simulate findLogoLocal
    const target = cleanedInput.toLowerCase();

    // List all Valencia containing teams
    const allValencias = localDb.filter(c => c.Name.includes("Valencia"));
    console.log("All 'Valencia' teams in DB:", allValencias.map(c => c.Name));

    // 1. Exact Match on cleaned name
    const exact = localDb.find(club => {
        const clubClean = cleanName(club.Name);
        return clubClean.toLowerCase() === target;
    });

    if (exact) {
        console.log(`SUCCESS: Found exact match: ${exact.Name}`);
    } else {
        console.log("FAILURE: No exact match found.");

        // Debug specific Valencia CF entry
        const valencia = localDb.find(c => c.Name.includes("Valencia"));
        if (valencia) {
            console.log("Found 'Valencia' entry in DB:", valencia);
            console.log("Cleaned DB Name:", cleanName(valencia.Name));
            console.log("Comparison:", cleanName(valencia.Name).toLowerCase(), "vs", target);
        }
    }
};

test();
