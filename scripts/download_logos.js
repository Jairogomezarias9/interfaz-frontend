
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { pipeline } = require('stream');
const util = require('util');
const streamPipeline = util.promisify(pipeline);

// --- Configuration ---
const API_URLS = [
    "http://185.254.96.194:8001/api/fast-odds",  // Live Fast Scraper
    "http://185.254.96.194:8001/api/oriol-odds"  // Upcoming/Full Odds Scraper
];
// Target: ../public/logos relative to this script
const TARGET_DIR = path.join(__dirname, '../public/logos');

// Try finding the JSON in multiple places
const DB_PATHS = [
    path.join(__dirname, '../soccer_wiki_logos.json'), // Root (usual local)
    path.join(__dirname, 'soccer_wiki_logos.json')     // Script dir (server fallback)
];

console.log("[DEBUG] Script dirname:", __dirname);

// --- Helpers ---

// Normalization for robust matching (removes special chars, spaces, case)
const normalizeForMatch = (str) => {
    if (!str) return "";
    // Keep only alphanumeric chars
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const cleanName = (name) => {
    if (!name) return "";
    return name.replace(/\bU19\b/g, '')
        .replace(/\bU21\b/g, '')
        .replace(/\bW\b/g, '')
        .replace(/\d+$/, '')
        .trim();
};

const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

const customFetch = (url) => {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('Status Code: ' + res.statusCode));
            }
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                try {
                    const str = Buffer.concat(data).toString();
                    if (!str) return resolve({});
                    resolve(JSON.parse(str));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
};

const downloadFile = async (url, fileName) => {
    const filePath = path.join(TARGET_DIR, fileName);
    if (fs.existsSync(filePath)) {
        return;
    }

    console.log(`Downloading: ${fileName} from ${url}`);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        const lib = url.startsWith('https') ? https : http;

        lib.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            streamPipeline(response, file)
                .then(() => resolve())
                .catch((err) => {
                    fs.unlink(filePath, () => { });
                    reject(err);
                });
        }).on('error', (err) => {
            fs.unlink(filePath, () => { });
            reject(err);
        });
    });
};

// --- Load DB ---
let localDb = [];
let dbLoaded = false;

for (const p of DB_PATHS) {
    try {
        if (fs.existsSync(p)) {
            console.log("[DEBUG] Found DB at:", p);
            const raw = fs.readFileSync(p);
            const parsed = JSON.parse(raw);
            // Handle { ClubData: [...] } or [...]
            localDb = Array.isArray(parsed) ? parsed : (parsed.ClubData || []);
            console.log(`Loaded ${localDb.length} logos.`);
            dbLoaded = true;
            break;
        }
    } catch (e) {
        console.warn("Failed to read DB at", p, e.message);
    }
}

if (!dbLoaded) {
    console.warn("[WARNING] Could not find 'soccer_wiki_logos.json' in either parent or current dir.");
}

// --- Logic ---

const findLogoLocal = (teamName) => {
    if (!localDb || localDb.length === 0) return null;

    // Normalize Input: "Valencia CF" -> "valenciacf"
    const normalizedInput = normalizeForMatch(cleanName(teamName));

    // 1. Exact Match on Normalized String
    const exact = localDb.find(item => normalizeForMatch(item.Name) === normalizedInput);
    if (exact) return exact.ImageURL || exact.LogoUrl;

    // 2. Contains Match (Normalized)
    const contains = localDb.find(item => {
        const normItem = normalizeForMatch(item.Name);
        return normItem.includes(normalizedInput) || normalizedInput.includes(normItem);
    });
    if (contains) return contains.ImageURL || contains.LogoUrl;

    // 3. Fuzzy Match (Levenshtein)
    if (normalizedInput.length > 4) {
        let bestMatch = null;
        let minDistance = 100;

        for (const item of localDb) {
            const normItem = normalizeForMatch(item.Name);
            const dist = levenshtein(normalizedInput, normItem);

            // Allow distance relative to length. 
            const threshold = Math.max(3, Math.floor(normalizedInput.length * 0.4));

            if (dist < minDistance && dist <= threshold) {
                minDistance = dist;
                bestMatch = item;
            }
        }

        if (bestMatch) {
            return bestMatch.ImageURL || bestMatch.LogoUrl;
        }
    }

    return null;
};

const spanishToEnglish = {
    "Marruecos": "Morocco",
    "Jordania": "Jordan",
    "España": "Spain",
    "Alemania": "Germany",
    "Francia": "France",
    "Italia": "Italy",
    "Inglaterra": "England",
    "Portugal": "Portugal",
    "Holanda": "Netherlands",
    "Países Bajos": "Netherlands",
    "Bélgica": "Belgium",
    "Croacia": "Croatia",
    "Dinamarca": "Denmark",
    "Suecia": "Sweden",
    "Suiza": "Switzerland",
    "Polonia": "Poland",
    "Rusia": "Russia",
    "Ucrania": "Ukraine",
    "Turquía": "Turkey",
    "Grecia": "Greece",
    "Argentina": "Argentina",
    "Brasil": "Brazil",
    "Uruguay": "Uruguay",
    "Colombia": "Colombia",
    "Chile": "Chile",
    "Perú": "Peru",
    "México": "Mexico",
    "Estados Unidos": "USA",
    "EE.UU.": "USA",
    "Japón": "Japan",
    "Corea del Sur": "South Korea",
    "China": "China",
    "Egipto": "Egypt",
    "Senegal": "Senegal",
    "Camerún": "Cameroon",
    "Nigeria": "Nigeria",
    "Costa de Marfil": "Ivory Coast",
    "Argelia": "Algeria",
    "Túnez": "Tunisia"
};

// --- External API Fallback ---
const searchTeamOnline = async (teamName, preferFlag = false) => {
    try {
        let searchName = cleanName(teamName);

        // 1. Try Translation (Spanish -> English) for National Teams
        if (spanishToEnglish[searchName]) {
            console.log(`[ONLINE] Translating "${searchName}" -> "${spanishToEnglish[searchName]}"`);
            searchName = spanishToEnglish[searchName];
            preferFlag = true; // Auto-enable flag preference if it was in our country list
        }

        console.log(`[ONLINE] Searching TheSportsDB for: "${searchName}" (Flag Preferred: ${preferFlag})`);
        const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchName)}`;
        const data = await customFetch(url);

        if (data && data.teams && data.teams.length > 0) {
            // Find best match (TheSportsDB returns array of matches)
            const validTeam = data.teams[0];
            if (validTeam) {
                console.log(`[ONLINE] Found match: ${validTeam.strTeam} (ID: ${validTeam.idTeam})`);

                let logo = null;

                if (preferFlag) {
                    // PRIORITIZE FLAGS for Countries
                    logo = validTeam.strTeamFlag || validTeam.strTeamBadge || validTeam.strTeamLogo || validTeam.strBadge || validTeam.strLogo;
                } else {
                    // PRIORITIZE BADGES for Clubs
                    logo = validTeam.strTeamBadge || validTeam.strTeamLogo || validTeam.strTeamFlag || validTeam.strBadge || validTeam.strLogo;
                }

                if (logo) {
                    return logo;
                } else {
                    console.warn(`[ONLINE] Team found but no logo/badge/flag in fields. Keys available: ${Object.keys(validTeam).filter(k => k.startsWith('str') && validTeam[k])}`);
                }
            }
        }
    } catch (e) {
        console.warn(`[ONLINE] Error searching for ${teamName}:`, e.message);
    }
    return null;
};

// --- Main ---
// --- Main Loop ---
const runDownloader = async () => {
    console.log("[DEBUG] Starting downloader cycle...");
    console.log("[DEBUG] TARGET_DIR resolved to:", path.resolve(TARGET_DIR));

    // Ensure directory exists
    try {
        if (!fs.existsSync(TARGET_DIR)) {
            console.log("[DEBUG] Creating directory:", TARGET_DIR);
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        }
    } catch (e) {
        console.error("Could not create target dir:", e);
    }

    // CLI Test Mode (Single Run)
    if (process.argv[2]) {
        const testTeam = process.argv[2];
        console.log(`[TEST] Testing specific team: "${testTeam}"`);
        console.log(`[TEST] Normalized: "${normalizeForMatch(cleanName(testTeam))}"`);

        const logoUrl = findLogoLocal(testTeam);

        if (logoUrl) {
            console.log(`[TEST] SUCCESS! Found logo URL: ${logoUrl}`);
            const safeName = cleanName(testTeam).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + ".png";
            await downloadFile(logoUrl, safeName);
        } else {
            console.log(`[TEST] FAILED. No logo found in local DB.`);

            if (testTeam.includes("Valencia")) {
                const valenciaMatches = localDb.filter(c => c.Name.includes("Valencia"));
                console.log("[TEST] debug: All DB entries with 'Valencia':", valenciaMatches.map(c => c.Name));
            }
        }
        // If testing a specific team, do not loop.
        process.exit(0);
    }

    console.log(`[${new Date().toISOString()}] Fetching current matches from ALL sources...`);

    const teams = new Set();

    try {
        // Sequentially fetch from all configured APIs (fast + oriol)
        for (const url of API_URLS) {
            try {
                console.log(`[DEBUG] Fetching from: ${url}`);
                const data = await customFetch(url);
                if (data.matches && Array.isArray(data.matches)) {
                    data.matches.forEach(m => {
                        // Handle potential different structures if necessary, but both seem to use m.competitors
                        if (m.competitors && m.competitors.home && m.competitors.home.name) teams.add(m.competitors.home.name);
                        if (m.competitors && m.competitors.away && m.competitors.away.name) teams.add(m.competitors.away.name);
                        // Fallback for flat structure if any
                        if (m.home_team) teams.add(m.home_team);
                        if (m.away_team) teams.add(m.away_team);
                    });
                }
            } catch (err) {
                console.warn(`[WARN] Failed to fetch from ${url}: ${err.message}`);
            }
        }

        console.log(`Found ${teams.size} unique teams currently playing/upcoming.`);

        for (const team of teams) {
            // Use NORMALIZED/CLEAN NAME for saving the file!
            // This ensures "U20 Costa Rica" saves as "costa_rica.png", matching frontend expectation.
            const normalizedName = cleanName(team) || team;

            const safeName = normalizedName
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
                .toLowerCase() + ".png";

            let logoUrl = null;
            let isCountry = false;

            // Check if it's a known country first (using clean name)
            if (spanishToEnglish[normalizedName] || spanishToEnglish[team]) {
                isCountry = true;
                // console.log(`[INFO] "${team}" is identified as a country. Prioritizing online search.`);
            }

            // 1. If Country, try Online First
            if (isCountry) {
                logoUrl = await searchTeamOnline(team);
            }

            // 2. If not country or Online failed, try Local DB
            if (!logoUrl) {
                logoUrl = findLogoLocal(team);
            }

            // 3. If still nothing and wasn't identified as country initially, try Online Fallback
            if (!logoUrl && !isCountry) {
                console.log(`[MISSING] Local match failed for: "${team}". Trying online fallback...`);
                logoUrl = await searchTeamOnline(team);
            }

            if (logoUrl) {
                try {
                    await downloadFile(logoUrl, safeName);
                    /*
                    if (isCountry || !findLogoLocal(team)) {
                        console.log(`[SUCCESS] Downloaded via Online API for: ${team}`);
                    }
                     */
                } catch (e) {
                    console.error(`Failed to download logo for ${team}:`, e.message);
                }
            } else {
                console.log(`[MISSING] Fatal: Could not find logo anywhere for: "${team}"`);
            }
        }
        console.log("Logo download process completed.");

    } catch (error) {
        console.error("Error in main loop:", error);
    }
};

const main = async () => {
    // Run immediately
    await runDownloader();

    // Then loop every 10 minutes
    const INTERVAL = 10 * 60 * 1000; // 10 minutes
    console.log(`[SYSTEM] Script will now run every ${INTERVAL / 60000} minutes.`);

    setInterval(async () => {
        console.log("\n[SYSTEM] Triggering scheduled run...");
        await runDownloader();
    }, INTERVAL);
};

main();
