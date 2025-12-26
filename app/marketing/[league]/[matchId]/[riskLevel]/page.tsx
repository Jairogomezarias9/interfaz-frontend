'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BTTSCard from '../../../components/BTTSCard';

// --- Interfaces (Copied for standalone functionality) ---
interface Tournament {
    id: number;
    name: string;
    urn_id: string;
}

interface CompetitorDetails {
    logo: string;
    name: string;
    urn_id: string;
}

interface Competitors {
    away: CompetitorDetails;
    home: CompetitorDetails;
}

// [NEW] Interfaces for Full Odds (Matches telegram page)
interface Outcome {
    id: number;
    name?: string;
    odds: number;
    probabilities: number;
    type: number;
    active: number;
    competitor?: boolean;
}

interface Market {
    id: number;
    vendorMarketId: number;
    name?: string;
    specifiers?: string; // [UPDATED] Added specifiers
    outcomes: Outcome[];
    status: number;
}

interface Match {
    id: string;
    id2?: number; // [NEW] Sequential ID injected by API
    league: string;
    home_team: string;
    away_team: string;
    teams: string;
    url: string;
    start_time: string;
    current_minute?: string;
    home_score?: string;
    away_score?: string;
    league_header?: {
        name: string;
        flag: string;
    };
    markets?: Market[]; // [NEW] Full Markets access
    over_2_5_odds?: string | number | null;
    stats_365?: Stats365;
    tournament: Tournament;
    competitors: Competitors;
    [key: string]: any; // Allow dynamic access for odds
}

interface TeamStats365 {
    total_shots?: string;
    shots_on_goal?: string;
    shots_off_goal?: string;
    blocked_shots?: string;
    passes_completed?: string;
    yellow_cards?: string;
    red_cards?: string;
    possession?: string;
    corners?: string;
}

interface Stats365 {
    home: TeamStats365;
    away: TeamStats365;
    is_simulated?: boolean;
}

// --- Icons & Helpers ---
const LIVE_BADGE_Icon = () => (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-[10px] font-bold tracking-widest text-red-400">LIVE</span>
    </div>
);

// Placeholder for JerseyIcon to ensure syntactical correctness
const JerseyIcon = ({ color = "#ffffff", className }: { color?: string, className?: string }) => (
    <svg className={className} style={{ color: color }} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
);

const TeamLogo = ({ name, className, defaultColor }: { name: string, className?: string, defaultColor?: string }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Construct local path: /logos/[sanitized_name].png
        // Matches the logic in the download script
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        setImgSrc(`/logos/${safeName}.png`);
        setHasError(false);
    }, [name]);

    if (imgSrc && !hasError) {
        return (
            <div className={`${className} bg-white/5 rounded-full p-1 flex items-center justify-center border border-white/10`}>
                <img
                    src={imgSrc}
                    alt={name}
                    className="w-full h-full object-contain"
                    onError={() => setHasError(true)}
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div className={`${className} bg-white/5 rounded-full p-1 flex items-center justify-center border border-white/10`}>
            <JerseyIcon color={defaultColor || "#ffffff"} className="w-full h-full p-1" />
        </div>
    );
};

// [NEW] Probability Bar Component (Copied from Telegram Page)
const ProbabilityBar = ({ probability }: { probability: number }) => {
    if (!probability || probability <= 0) return null;

    const percentage = probability * 100;

    const getColor = (prob: number) => {
        if (prob >= 50) return 'from-emerald-500 to-green-400';
        if (prob >= 30) return 'from-amber-500 to-yellow-400';
        return 'from-rose-500 to-red-400';
    };

    return (
        <div className="w-full flex flex-col gap-1 mt-1.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Probabilidad</span>
                <span className="text-[10px] font-bold text-white">{percentage.toFixed(1)}%</span>
            </div>
            <div className="relative w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                    className={`absolute left-0 top-0 h-full bg-gradient-to-r ${getColor(percentage)} transition-all duration-500 ease-out rounded-full`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
};

// [NEW] Market Name Mapping
const MARKET_NAMES: Record<number, string> = {
    1: "Resultado del partido",
    2: "Handicap",
    9: "Total (Más/Menos)",
    10: "Doble Oportunidad",
    11: "Apuesta sin empate",
    12: "Apuesta sin empate",
    14: "Hándicap Europeo",
    16: "Handicap",
    18: "Total",
    19: "Total Team Goals",
    21: "Correct Score",
    24: "Halftime/Fulltime",
    25: "Par / Impar",
    26: "Goles: Par / Impar",
    29: "Ambos equipos anotarán",
    47: "Mitad / Final",
    55: "First Goal Method",
    74: "To Qualify",
    80: "First Card",
    83: "Total Cards",
    96: "Corners 1x2",
    100: "First Corner",
    113: "Total Corners",
    253: "Player to Score",
};

// [NEW] CORRECT Helper to format names with Specifiers support and Full Logic
const formatOutcomeName = (name: string | undefined, hasCompetitor: boolean, match: Match, specifiers?: string) => {
    const homeName = match.competitors?.home?.name || match.home_team || "Home";
    const awayName = match.competitors?.away?.name || match.away_team || "Away";

    if (!name) return hasCompetitor ? (name === "1" ? homeName : name === "2" ? awayName : "Team") : "-";

    let formatted = name.trim();

    // 1. Basic Translations
    if (formatted.toLowerCase() === "yes" || formatted.toLowerCase() === "si") return "Sí";
    if (formatted.toLowerCase() === "no") return "No";

    // 2. Smart Regex Replacement for 1, 2, X
    formatted = formatted.replace(/^1(?=[\s(]|$)/, homeName);
    formatted = formatted.replace(/^2(?=[\s(]|$)/, awayName);
    formatted = formatted.replace(/^X(?=[\s(]|$)/, "Empate");
    formatted = formatted.replace(/^Draw(?=[\s(]|$)/i, "Empate");

    // 3. Double Chance (1X, X2, 12)
    if (formatted === "1X") return `${homeName} / Empate`;
    if (formatted === "X2") return `Empate / ${awayName}`;
    if (formatted === "12") return `${homeName} / ${awayName}`;

    // 4. Over/Under Translations
    if (formatted.includes("Over")) formatted = formatted.replace("Over", "Más de");
    if (formatted.includes("Under")) formatted = formatted.replace("Under", "Menos de");

    // 5. Append Specifiers (Lines)
    if (specifiers) {
        const totalMatch = specifiers.match(/total=([^|]+)/);
        const hcpMatch = specifiers.match(/hcp=([^|]+)/);
        const line = totalMatch ? totalMatch[1] : (hcpMatch ? hcpMatch[1] : null);

        if (line) {
            if (!formatted.includes(line)) {
                formatted = `${formatted} (${line})`;
            }
        }
    }

    return formatted;
};

// --- New Marketing Logic with Structured Bets (Full Telegram Port) ---
const getMarketingData = (risk: string, match: Match) => {
    // 1. Marketing configurations
    const configs = {
        safe: {
            title: "",
            color: "emerald",
            gradient: "from-emerald-400 to-emerald-600",
            bgGradient: "from-emerald-900/40 to-black",
            borderColor: "border-emerald-500/50",
            shadow: "shadow-emerald-500/20",
            confidence: 85,
            description: "",
            label: "Bet",
            minOdd: 1.05,
            maxOdd: 1.60
        },
        medium: {
            title: "VALOR ÓPTIMO (SMART BET)",
            color: "blue",
            gradient: "from-blue-400 to-blue-600",
            bgGradient: "from-blue-900/40 to-black",
            borderColor: "border-blue-500/50",
            shadow: "shadow-blue-500/20",
            confidence: 65,
            description: "Equilibrio perfecto entre riesgo y beneficio.",
            label: "Valor Detectado",
            minOdd: 1.60,
            maxOdd: 2.50
        },
        risky: {
            title: "HIGH YIELD (RIESGO ALTO)",
            color: "rose",
            gradient: "from-rose-400 to-rose-600",
            bgGradient: "from-rose-900/40 to-black",
            borderColor: "border-rose-500/50",
            shadow: "shadow-rose-500/20",
            confidence: 35,
            description: "Oportunidad de alto retorno. Staking bajo.",
            label: "High Reward",
            minOdd: 2.50,
            maxOdd: 999.0 // No limit
        }
    };

    const config = configs[risk as keyof typeof configs] || configs.medium;

    // 2. Select Random Outcome based on Risk Profile
    let selectedOutcome: { marketName: string; outcomeName: string; odds: string; probability: number; marketId?: number } = {
        marketName: "Total (Más/Menos)",
        outcomeName: "Más de (2.5)",
        odds: "2.00",
        probability: 0.5,
        marketId: 9
    }; // Fallback

    if (match.markets && match.markets.length > 0) {
        // Flatten all outcomes with their market context
        // [CRITICAL] Sort outcomes by ID first to match Telegram logic for index-based markets (HT/FT)
        const allOutcomes = match.markets.flatMap(m => {
            const sortedOutcomes = [...(m.outcomes || [])].sort((a, b) => a.id - b.id);

            return sortedOutcomes.map((o, idx) => {
                // Resolve Market Name matches OddsDisplay
                let mName = MARKET_NAMES[m.vendorMarketId];
                if (!mName) {
                    if (m.vendorMarketId === 18 && m.specifiers?.includes('total=') && !m.specifiers.includes('rest')) mName = 'Total';
                    else if (m.vendorMarketId === 18 && m.specifiers?.includes('rest')) mName = 'Total (Resto)';
                    else if (m.vendorMarketId === 16) mName = 'Handicap';
                    else if (m.name && m.name.trim().length > 1) mName = m.name;
                    else mName = "Mercado"; // Final fallback
                }

                // [CRITICAL] Apply Market-Specific Outcome Naming Logic (Ported from Telegram)
                let finalName = formatOutcomeName(o.name || `${o.id}`, !!o.competitor, match, m.specifiers);

                // ID 1: Match Winner
                if (m.vendorMarketId === 1) {
                    const h = match.competitors?.home?.name || match.home_team || "Home";
                    const a = match.competitors?.away?.name || match.away_team || "Away";
                    if (idx === 0) finalName = h;
                    else if (idx === 1) finalName = "Empate";
                    else finalName = a;
                }
                // ID 9 & 18: Total Goals (Over/Under)
                else if (m.vendorMarketId === 9 || m.vendorMarketId === 18) {
                    const totalMatch = (m.specifiers || "").match(/total=([^&]+)/);
                    const totalVal = totalMatch ? totalMatch[1] : (m.specifiers?.split("total=")[1]?.split("|")[0] || "2.5");
                    const rawName = (o.name || "").toLowerCase();

                    // If index 0 -> Over, Index 1 -> Under usually. Or check name.
                    if (rawName.includes("over") || rawName.includes("más") || idx === 0) finalName = `Más de (${totalVal})`;
                    else finalName = `Menos de (${totalVal})`;
                }
                // ID 10: Double Chance
                else if (m.vendorMarketId === 10) {
                    const h = match.competitors?.home?.name || match.home_team || "Home";
                    const a = match.competitors?.away?.name || match.away_team || "Away";
                    if (idx === 0) finalName = `${h} / Empate`;
                    else if (idx === 1) finalName = `${h} / ${a}`;
                    else finalName = `Empate / ${a}`;
                }
                // ID 29: BTTS
                else if (m.vendorMarketId === 29) {
                    if (idx === 0) finalName = "Sí";
                    else finalName = "No";
                }
                // ID 25/26: Odd/Even
                else if (m.vendorMarketId === 25 || m.vendorMarketId === 26) {
                    if (idx === 0) finalName = "Impar";
                    else finalName = "Par";
                }
                // ID 47: HT/FT (Mitad / Final) - SPECIFIC INDEX LOGIC
                // The API outcomes come sorted but often nameless. We map by index.
                else if (m.vendorMarketId === 47 || m.vendorMarketId === 24) {
                    // Order from Telegram page logic:
                    // 1/1, X/1, 2/1, 1/X, X/X, 2/X, 1/2, X/2, 2/2
                    const htftCodes = [
                        "1/1", "X/1", "2/1",
                        "1/X", "X/X", "2/X",
                        "1/2", "X/2", "2/2"
                    ];

                    let rawCode = (o.name || "").trim();

                    // If name is empty/useless, use index map (Tele logic)
                    if (idx < htftCodes.length && (!rawCode || rawCode.length < 3)) {
                        rawCode = htftCodes[idx];
                    }

                    // Now Formatting
                    const h = match.competitors?.home?.name || match.home_team || "Home";
                    const a = match.competitors?.away?.name || match.away_team || "Away";

                    const map: Record<string, string> = {
                        "1/1": `${h} / ${h}`,
                        "1/X": `${h} / Empate`,
                        "1/2": `${h} / ${a}`,
                        "X/1": `Empate / ${h}`,
                        "X/X": `Empate / Empate`,
                        "X/2": `Empate / ${a}`,
                        "2/1": `${a} / ${h}`,
                        "2/X": `${a} / Empate`,
                        "2/2": `${a} / ${a}`
                    };

                    // Normalize (remove spaces, uppercase) just in case
                    const cleanCode = rawCode.replace(/\s+/g, '').toUpperCase();

                    if (map[cleanCode]) finalName = map[cleanCode];
                    else finalName = rawCode; // Fallback to code
                }
                // ID 21: Correct Score - usually comes formatted but ensure formatting
                else if (m.vendorMarketId === 21) {
                    // Usually "1-0", "2-1". Ensure it looks clean.
                    // (Already handled by raw extraction usually)
                }

                return {
                    ...o,
                    marketId: m.vendorMarketId,
                    marketName: mName,
                    displayName: finalName,
                    rawOdds: o.odds,
                    rawProb: o.probabilities
                };
            })
        });

        // Filter by odds range
        let candidates = allOutcomes.filter(o =>
            o.rawOdds >= config.minOdd && o.rawOdds < config.maxOdd
        );

        // [IMPOVEMENT] Filter out generic "Mercado" if better options exist
        const specificCandidates = candidates.filter(c =>
            c.marketName !== "Mercado" && c.marketName !== "Market" && c.marketName !== "Mercado"
        );
        if (specificCandidates.length > 0) {
            candidates = specificCandidates;
        }

        if (candidates.length > 0) {
            // [NEW] Strategy Logic: Prioritize Markets based on Risk Level
            if (risk === "risky") {
                // For Risky, prefer "Exotic" markets (Correct Score, HT/FT) over simple Match Winner
                // IDs: 21 (CS), 24/47 (HT/FT), 25/26 (Odd/Even - maybe), 55 (First Goal)
                const exoticCandidates = candidates.filter(c =>
                    [21, 24, 47, 55].includes(c.marketId) || c.marketName.includes("Exacto") || c.marketName.includes("Mitad")
                );

                if (exoticCandidates.length > 0) {
                    candidates = exoticCandidates;
                } else {
                    // If no exotic, try to avoid ID 1 (Match Winner) if possible, unless high odds
                    const nonWinnerCandidates = candidates.filter(c => c.marketId !== 1);
                    if (nonWinnerCandidates.length > 0) {
                        candidates = nonWinnerCandidates;
                    }
                }
            }

            const winner = candidates[Math.floor(Math.random() * candidates.length)];
            const prob = winner.rawProb || (1 / winner.rawOdds);

            selectedOutcome = {
                marketName: winner.marketName,
                outcomeName: winner.displayName,
                odds: winner.rawOdds.toFixed(2),
                probability: prob,
                marketId: winner.marketId // [FIX] Include ID
            };
        } else {
            // [IMPROVEMENT] Better Fallback for Risky to avoid generic "Mercado"
            if (config.minOdd > 2.0) {
                // Try to find ANY high odd bet that looks decent and has a name
                const highOdds = allOutcomes.filter(o => o.rawOdds > 2.5 && o.marketName !== "Mercado");
                if (highOdds.length > 0) {
                    const fallback = highOdds[Math.floor(Math.random() * highOdds.length)];
                    selectedOutcome = {
                        marketName: fallback.marketName,
                        outcomeName: fallback.displayName,
                        odds: fallback.rawOdds.toFixed(2),
                        probability: fallback.rawProb || (1 / fallback.rawOdds),
                        marketId: fallback.marketId // [FIX] Include ID
                    };
                } else {
                    // Synthetic Fallback
                    selectedOutcome = { marketName: "Marcador Exacto", outcomeName: "3-1", odds: "15.00", probability: 0.05, marketId: 21 };
                }
            } else {
                const randomFallback = allOutcomes[Math.floor(Math.random() * allOutcomes.length)];
                selectedOutcome = {
                    marketName: randomFallback ? randomFallback.marketName : "Mercado",
                    outcomeName: randomFallback ? randomFallback.displayName : "-",
                    odds: randomFallback ? randomFallback.rawOdds.toFixed(2) : "1.00",
                    probability: randomFallback ? (randomFallback.rawProb || (1 / randomFallback.rawOdds)) : 0,
                    marketId: randomFallback ? randomFallback.marketId : 0
                };
            }
        }
    } else {
        // Fallback checks using properties if markets array missing
        if (config.maxOdd < 1.6 && match.over_1_5_odds) {
            selectedOutcome = { marketName: "Total Goles", outcomeName: "Más de 1.5", odds: match.over_1_5_odds.toString(), probability: 0.7, marketId: 9 };
        } else if (config.minOdd > 2.5 && match.home_score && match.away_score) {
            selectedOutcome = { marketName: "Marcador Exacto", outcomeName: "3-1", odds: "15.00", probability: 0.05, marketId: 21 };
        }
    }

    return {
        ...config,
        marketingOdd: selectedOutcome.odds,
        betMarket: selectedOutcome.marketName,
        betOutcome: selectedOutcome.outcomeName,
        betProbability: selectedOutcome.probability,
        // [NEW] Pass Full Market Context for Visualizations
        marketId: (selectedOutcome as any).marketId,
        // Find the original market object to pass all its outcomes
        marketOutcomes: match.markets?.find(m => m.vendorMarketId === (selectedOutcome as any).marketId)?.outcomes || []
    };
};

export default function MarketingPage() {
    const params = useParams();
    const router = useRouter();
    const { league, matchId, riskLevel } = params; // [UPDATED] Read ID and League

    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch match data
    useEffect(() => {
        const fetchMatch = async () => {
            try {
                // Fetch all odds from the same source as the Telegram page
                const res = await fetch('/api/oriol-odds');
                const data = await res.json();

                // [UPDATED] Find match by ID2 AND League Slug
                const found = data.matches.find((m: Match) => {
                    // Check ID Match (Sequential ID)
                    // Ensure type safety (number vs string)
                    if (m.id2 != Number(matchId)) return false;

                    // Check League Match
                    // Slugify the match's league name using same logic as link generator
                    // Fallback to league if header missing
                    const leagueName = m.league_header?.name || m.tournament?.name || "";
                    const mSlug = leagueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

                    // Compare with URL param 'league'
                    // NOTE: Sometimes slug might be slightly different if params had extra encoding?
                    // But usually exact match should work given we generated it.
                    return mSlug === league;
                });

                if (found) {
                    setMatch(found);
                } else {
                    // Fallback: If not found, try finding just by ID if unique? Dangerous. 
                    // Or log.
                    console.log("Match not found by league slug, checking fallback...");
                }
            } catch (e) {
                console.error("Error fetching match:", e);
            } finally {
                setLoading(false);
            }
        };

        if (matchId && league) fetchMatch();
    }, [matchId, league]);

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
    );

    if (!match) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gray-500">
            {/* If match not found, still show a generic error, but ideally this won't happen now */}
            Match not found or finished.
        </div>
    );

    const marketData = getMarketingData(riskLevel as string, match);

    // Check if match is live (has minute and it's not "Not Started" or empty)
    const isLive = match.current_minute && match.current_minute !== "Not Started" && !match.current_minute.includes("00:00");
    // Format start time if not live
    const startTimeFormatted = new Date(match.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`min-h-screen flex flex-col bg-[#050505] text-white font-sans selection:bg-${marketData.color}-500/30`}>

            {/* 1. Navbar */}
            <div className="w-full h-16 bg-gray-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-4">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Volver
                </button>
                <div className="flex items-center gap-2">
                    <h1 className={`text-xl font-black tracking-tighter bg-gradient-to-r ${marketData.gradient} bg-clip-text text-transparent`}>
                        GRIZZLY ANALYSIS
                    </h1>
                </div>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            {/* 2. Hero Section / Background */}
            <div className={`relative w-full flex flex-col items-center pt-8 pb-12 overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${marketData.bgGradient} opacity-20 pointer-events-none`}></div>

                {/* Marketing Title */}
                <div className="relative z-10 text-center mb-8 px-4">
                    <span className={`inline-block py-1 px-3 rounded-full bg-${marketData.color}-500/10 border ${marketData.borderColor} text-${marketData.color}-400 text-xs font-black tracking-[0.2em] uppercase mb-3`}>
                        {marketData.label} DETECTED
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                        {marketData.title}
                    </h2>
                    <p className="mt-4 text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed font-medium">
                        {marketData.description}
                    </p>
                </div>

                {/* Match Display (Simplified MatchCard) */}
                <div className="relative z-10 w-full max-w-md px-4">
                    <div className={`relative group bg-[#0A0A0A] rounded-2xl overflow-hidden border ${marketData.borderColor} shadow-2xl ${marketData.shadow}`}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/5">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider truncate">
                                {match.league_header?.name || match.tournament.name}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-mono text-xs font-bold bg-white/5 px-2 py-0.5 rounded">
                                    {startTimeFormatted}
                                </span>
                            </div>
                        </div>

                        {/* Teams & Score */}
                        <div className="flex flex-col justify-center py-6 px-4 bg-[#050505]/60">
                            <div className="flex items-center justify-between gap-4">
                                {/* Home */}
                                <div className="flex flex-col items-center gap-3 w-1/3">
                                    <div className="relative h-12 w-12">
                                        <TeamLogo name={match.competitors.home.name} className="w-12 h-12" defaultColor="#3b82f6" />
                                    </div>
                                    <span className="text-[11px] font-bold text-center text-gray-200 leading-tight uppercase">{match.competitors.home.name}</span>
                                </div>

                                {/* VS Only - No Live Score */}
                                <div className="flex flex-col items-center justify-center w-1/3 shrink-0">
                                    <div className="bg-transparent">
                                        <span className="text-3xl font-black text-gray-600 tracking-widest font-mono italic">
                                            VS
                                        </span>
                                    </div>
                                </div>

                                {/* Away */}
                                <div className="flex flex-col items-center gap-3 w-1/3">
                                    <div className="relative h-12 w-12">
                                        <TeamLogo name={match.competitors.away.name} className="w-12 h-12" defaultColor="#ef4444" />
                                    </div>
                                    <span className="text-[11px] font-bold text-center text-gray-200 leading-tight uppercase">{match.competitors.away.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Analysis & Bet Box */}
                        <div className="bg-[#111] p-5 border-t border-white/5">

                            {/* [NEW] Conditional Visualization - One by One */}
                            {(() => {
                                // 1. BTTS (ID 29)
                                if ((marketData as any).marketId === 29) {
                                    return (
                                        <div className="flex justify-center mb-6">
                                            <BTTSCard
                                                outcomes={(marketData as any).marketOutcomes}
                                                betDetails={{
                                                    marketName: marketData.betMarket,
                                                    outcomeName: marketData.betOutcome,
                                                    odds: marketData.marketingOdd as string,
                                                    probability: marketData.betProbability,
                                                    color: marketData.color
                                                }}
                                            />
                                        </div>
                                    );
                                }

                                // Default/Fallback View (for now) until other cards are built
                                return (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold ml-1">{marketData.betMarket}</span>
                                        <div className={`flex flex-col bg-${marketData.color}-500/10 rounded-lg px-4 py-3 border border-${marketData.color}-500/30 hover:bg-${marketData.color}-500/20 transition-colors`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm text-white font-bold leading-tight break-words">
                                                    {marketData.betOutcome}
                                                </span>
                                                <span className={`text-xl font-black ml-2 shrink-0 text-${marketData.color}-400`}>{marketData.marketingOdd}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold mt-1">
                                                <span>Probability</span>
                                                <span>{(marketData.betProbability * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                                                <div className={`h-full bg-${marketData.color}-500`} style={{ width: `${Math.min(marketData.betProbability * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Removed Button */}

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to slugify (optional usage if needed internally)
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
