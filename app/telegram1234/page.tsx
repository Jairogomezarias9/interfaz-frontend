'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
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

// [NEW] Interfaces for Full Odds
interface Outcome {
    id: number;
    name?: string; // [NEW] From API
    odds: number;
    probabilities: number;
    type: number;
    active: number;
    competitor?: boolean;
}

interface Market {
    id: number;
    vendorMarketId: number;
    name?: string; // [NEW] From API
    specifiers?: string;
    extendedSpecifiers?: string;
    outcomes: Outcome[];
    status: number;
}

interface Match {
    id: string;
    league: string;
    home_team: string;
    away_team: string;
    teams: string;
    url: string;
    start_time: string;
    current_minute?: string;
    home_score?: string;
    away_score?: string;

    // Header
    league_header?: {
        name: string;
        flag: string;
    };

    // [NEW] Full Markets
    markets?: Market[];

    stats_365?: any; // Keeping basic stats structure if present

    tournament: Tournament;
    competitors: Competitors;
}

// --- Components ---

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

// New Component: Team Logo (Local)
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
            <img
                src={imgSrc}
                alt={name}
                className={`${className} object-contain`}
                onError={() => setHasError(true)}
                loading="lazy"
            />
        );
    }

    return <JerseyIcon color={defaultColor || "#ffffff"} className={className} />;
};

// --- Helper: Parse Minute ---
const parseMatchTime = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const normalized = timeStr.toLowerCase().trim();
    if (normalized.includes('ht') || normalized.includes('half')) return 45;
    if (timeStr.includes('+')) return parseInt(timeStr.split('+')[0]) || 0;
    return parseInt(timeStr) || 0;
}

// --- Component: Probability Bar ---
const ProbabilityBar = ({ probability }: { probability: number }) => {
    if (!probability || probability <= 0) return null;

    // Convert probability to percentage (assuming it's between 0-1)
    const percentage = probability * 100;

    // Color based on probability
    const getColor = (prob: number) => {
        if (prob >= 50) return 'from-emerald-500 to-green-400';
        if (prob >= 30) return 'from-amber-500 to-yellow-400';
        return 'from-rose-500 to-red-400';
    };

    return (
        <div className="flex flex-col gap-1 mt-1.5">
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


// --- [NEW] Component: OddsDisplay ---
// Displays a grid of available betting markets
const OddsDisplay = ({ markets, match, filterHighOdds }: { markets: Market[], match: Match, filterHighOdds?: boolean }) => {
    if (!markets || markets.length === 0) return <div className="p-3 text-xs text-gray-500">No active markets found.</div>;

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

    // Helper to format outcome names with team names
    const formatOutcomeName = (name: string | undefined, hasCompetitor: boolean) => {
        const homeName = match.competitors?.home?.name || match.home_team || "Home";
        const awayName = match.competitors?.away?.name || match.away_team || "Away";

        if (!name) return hasCompetitor ? (name === "1" ? homeName : name === "2" ? awayName : "Team") : "-";

        // Clean up basic name
        let formatted = name.trim();

        // Basic Translations
        if (formatted.toLowerCase() === "yes" || formatted.toLowerCase() === "si") return "Sí";
        if (formatted.toLowerCase() === "no") return "No";

        // [UPDATED] Smart Regex Replacement for 1, 2, X
        formatted = formatted.replace(/^1(?=[\s(]|$)/, homeName);
        formatted = formatted.replace(/^2(?=[\s(]|$)/, awayName);
        formatted = formatted.replace(/^X(?=[\s(]|$)/, "Empate");
        formatted = formatted.replace(/^Draw(?=[\s(]|$)/i, "Empate");

        // Double Chance (1X, X2, 12)
        if (formatted === "1X") return `${homeName} / Empate`;
        if (formatted === "X2") return `Empate / ${awayName}`;
        if (formatted === "12") return `${homeName} / ${awayName}`;

        // Asian Handicap / Totals prefixes
        if (formatted.toLowerCase().startsWith('hcp')) {
            return formatted.replace(/hcp\s?/i, '').trim();
        }

        // HT/FT codes like "1/1", "X/2", "1/X"
        if (formatted.includes("/")) {
            const parts = formatted.split("/");
            const mappedParts = parts.map(p => {
                p = p.trim();
                if (p === "1") return homeName;
                if (p === "2") return awayName;
                if (p === "X" || p.toLowerCase() === "draw") return "Empate";
                return p;
            });
            return mappedParts.join(" / ");
        }

        return formatted;
    };

    // Group by Category
    const getCategory = (m: Market): string | null => {
        // 1. Static Map (Priority to ensure translations are used over API names)
        const name = MARKET_NAMES[m.vendorMarketId];
        if (name) return name;

        // 2. Specific Filtering (Fallback)
        if (m.vendorMarketId === 18 && m.specifiers?.includes('total=') && !m.specifiers.includes('rest')) return 'Total';
        if (m.vendorMarketId === 18 && m.specifiers?.includes('rest')) return 'Goals (Rest of Match)';

        if (m.vendorMarketId === 16 && !m.specifiers?.includes('rest')) return 'Handicap';
        if (m.vendorMarketId === 16 && m.specifiers?.includes('rest')) return 'Handicap (Rest)';

        // 3. API Name (Secondary Priority)
        // Check if name exists and is not just a number or empty. 
        // Only use if we haven't mapped it above.
        if (m.name && m.name.trim().length > 1) return m.name;

        // 4. Fallback -> Return null to hide
        return null;
    };

    const grouped = markets.reduce((acc, m) => {
        const cat = getCategory(m);
        if (!cat) return acc; // Skip unmapped markets

        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {} as Record<string, Market[]>);

    // [NEW] Helper to check if market should be centered/aligned
    const isCenteredMarket = (vendorMarketId: number) => {
        // Markets that should be centered with gap: 1, 29, 26, 10, 11/12
        return [1, 29, 26, 10, 11, 12].includes(vendorMarketId);
    };

    // Helper to render a single market row
    const renderMarket = (m: Market, index: number) => {
        // Label construction
        let label = "";

        // If we have specifiers, they are usually the most relevant "sub-label" (e.g. "Over 2.5", "Hcp -1")
        if (m.extendedSpecifiers) {
            label = m.extendedSpecifiers.replace(/_/g, ' ').replace('=', ' ');
        } else if (m.specifiers) {
            label = m.specifiers.replace(/_/g, ' ').replace('=', ' ');
        }

        // If no specifier, it might be a main market. 
        if (!label) {
            const mappedName = MARKET_NAMES[m.vendorMarketId];

            // If market has a specific name from API that differs from category, use it
            if (m.name && m.name !== getCategory(m)) label = m.name;
            else if (mappedName) label = mappedName === getCategory(m) ? "Main" : mappedName;
            else label = `Market ${m.vendorMarketId}`;
        }

        // Sort outcomes (Usually Over/Under or Home/Away)
        let sortedOutcomes = [...m.outcomes].sort((a, b) => a.id - b.id);

        // [NEW] Filter outcomes when filterHighOdds is enabled
        if (filterHighOdds) {
            sortedOutcomes = sortedOutcomes.filter(o => o.odds && o.odds >= 5);
        }

        // Skip this market if no outcomes match the filter
        if (sortedOutcomes.length === 0) return null;

        // [NEW] Apply centered layout for specific markets
        const useCenteredLayout = isCenteredMarket(m.vendorMarketId);

        return (
            <div key={`${m.id}-${index}`} className={`flex flex-col border-b border-white/5 pb-3 mb-3 last:border-0 last:pb-0 ${useCenteredLayout ? 'col-span-2' : ''}`}>
                <span className="text-[11px] text-gray-300 font-bold uppercase mb-2 tracking-wide border-l-2 border-emerald-500 pl-2 w-full">{label}</span>
                <div className={useCenteredLayout ? 'flex items-center justify-between w-full' : 'grid grid-cols-2 md:grid-cols-3 gap-3 w-full'}>
                    {sortedOutcomes.map((o, idx) => {
                        let displayName = o.name || (o.competitor ? "Team" : "-");

                        // [FIX] Specific Mapping for Mitad/Final (ID 47)
                        // API returns null names, but IDs are sorted in this order:
                        // 1/1, X/1, 2/1, 1/X, X/X, 2/X, 1/2, X/2, 2/2
                        if (m.vendorMarketId === 47) {
                            const htftMap = [
                                "1/1", "X/1", "2/1",
                                "1/X", "X/X", "2/X",
                                "1/2", "X/2", "2/2"
                            ];
                            if (idx < htftMap.length) {
                                displayName = htftMap[idx];
                            }
                        }

                        // [FIX] Specific Mapping for Asian Handicap (ID 2 or 16)
                        // Typically sorted by Line, then Home/Away? 
                        // Actually sortedOutcomes is by ID.
                        // Usually: ID X (Home), ID X+1 (Away).
                        // So even index = Home, odd index = Away.
                        // And we assume the name coming in is just the value like "-1.75" (stripped of hcp via formatOutcomeName)
                        if (m.vendorMarketId === 16 || m.vendorMarketId === 2) {
                            const homeName = match.competitors?.home?.name || match.home_team || "Home";
                            const awayName = match.competitors?.away?.name || match.away_team || "Away";

                            // Let formatOutcomeName clean "hcp -1.75" -> "-1.75" first
                            const val = formatOutcomeName(displayName, !!o.competitor);

                            // If index is Even -> Home. Odd -> Away.
                            if (idx % 2 === 0) displayName = `${homeName} (${val})`;
                            else displayName = `${awayName} (${val})`;

                            // Return early to avoid re-formatting inside JSX
                            return (
                                <div key={o.id} className="flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">
                                            {displayName}
                                        </span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] Specific Mapping for European Handicap (ID 14)
                        // Specifiers: "hcp=0:1"
                        // Outcomes: 3 (Home, Draw, Away) - Names are null
                        if (m.vendorMarketId === 14) {
                            const homeName = match.competitors?.home?.name || match.home_team || "Home";
                            const awayName = match.competitors?.away?.name || match.away_team || "Away";

                            // Extract hcp value from specifiers of the MARKET
                            // m.specifiers is like "hcp=([^&]+)"
                            const hcpMatch = (m.specifiers || "").match(/hcp=([^&]+)/);
                            const hcpVal = hcpMatch ? hcpMatch[1] : "";

                            // 0 -> Home, 1 -> Draw, 2 -> Away
                            if (idx === 0) displayName = `${homeName} (${hcpVal})`;
                            else if (idx === 1) displayName = `Empate (${hcpVal})`;
                            else if (idx === 2) displayName = `${awayName} (${hcpVal})`;

                            return (
                                <div key={o.id} className="flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">
                                            {displayName}
                                        </span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] Specific Mapping for Total (ID 18)
                        // Specifiers: "total=2.5"
                        if (m.vendorMarketId === 18) {
                            const totalMatch = (m.specifiers || "").match(/total=([^&]+)/);
                            const totalVal = totalMatch ? totalMatch[1] : "";
                            const rawName = (o.name || "").toLowerCase();

                            if (rawName.includes("over") || rawName.includes("más") || idx === 0) displayName = `Más de (${totalVal})`;
                            else displayName = `Menos de (${totalVal})`;

                            return (
                                <div key={o.id} className="flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">
                                            {displayName}
                                        </span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] ID 15: Winning Margin (Margen de victoria)



                        // [FIX] ID 1: Match Winner
                        if (m.vendorMarketId === 1) {
                            const h = match.competitors?.home?.name || match.home_team || "Home";
                            const a = match.competitors?.away?.name || match.away_team || "Away";
                            if (idx === 0) displayName = h;
                            else if (idx === 1) displayName = "Empate";
                            else displayName = a;

                            // Apply w-1/3 only to first and last (like team shields)
                            const widthClass = useCenteredLayout ? (idx === 0 || idx === 2 ? 'w-1/3' : '') : 'min-w-0';

                            return (
                                <div key={o.id} className={`flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden ${widthClass}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">{displayName}</span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] ID 10: Double Chance (1X, 12, X2)
                        if (m.vendorMarketId === 10) {
                            const h = match.competitors?.home?.name || match.home_team || "Home";
                            const a = match.competitors?.away?.name || match.away_team || "Away";
                            if (idx === 0) displayName = `${h} / Empate`;
                            else if (idx === 1) displayName = `${h} / ${a}`;
                            else displayName = `Empate / ${a}`;

                            // Apply w-1/3 only to first and last
                            const widthClass = useCenteredLayout ? (idx === 0 || idx === 2 ? 'w-1/3' : '') : 'min-w-0';

                            return (
                                <div key={o.id} className={`flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden ${widthClass}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">{displayName}</span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] ID 11 & 12: Draw No Bet
                        if (m.vendorMarketId === 11 || m.vendorMarketId === 12) {
                            const h = match.competitors?.home?.name || match.home_team || "Home";
                            const a = match.competitors?.away?.name || match.away_team || "Away";
                            if (idx === 0) displayName = h;
                            else displayName = a;

                            // For 2 outcomes: first goes left (w-1/3), second goes right (w-1/3)
                            const widthClass = useCenteredLayout ? 'w-1/3' : 'min-w-0';

                            return (
                                <div key={o.id} className={`flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden ${widthClass}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">{displayName}</span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] ID 25 & 26: Odd/Even (Par/Impar)
                        if (m.vendorMarketId === 25 || m.vendorMarketId === 26) {
                            // Force explicit names: 0 -> Impar, 1 -> Par
                            if (idx === 0) displayName = "Impar";
                            else displayName = "Par";

                            // For 2 outcomes: both get w-1/3, justify-between will position them left and right
                            const widthClass = useCenteredLayout ? 'w-1/3' : 'min-w-0';

                            return (
                                <div key={o.id} className={`flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden ${widthClass}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">{displayName}</span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        // [FIX] ID 29: BTTS
                        if (m.vendorMarketId === 29) {
                            if (idx === 0) displayName = "Sí";
                            else displayName = "No";

                            // For 2 outcomes: both get w-1/3
                            const widthClass = useCenteredLayout ? 'w-1/3' : 'min-w-0';

                            return (
                                <div key={o.id} className={`flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden ${widthClass}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">{displayName}</span>
                                        <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                    </div>
                                    <ProbabilityBar probability={o.probabilities} />
                                </div>
                            );
                        }

                        return (
                            <div key={o.id} className="flex flex-col bg-white/[0.03] rounded px-3 py-2 border border-white/5 hover:bg-white/[0.08] transition-colors group overflow-hidden min-w-0">
                                <div className="flex justify-between items-center">
                                    {/* Outcome Name/Label */}
                                    <span className="text-[10px] text-gray-400 font-medium leading-tight group-hover:text-gray-200 transition-colors break-words">
                                        {formatOutcomeName(displayName, !!o.competitor)}
                                    </span>
                                    <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">{o.odds}</span>
                                </div>
                                <ProbabilityBar probability={o.probabilities} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 p-4 bg-[#050505]/40 text-left">
            {Object.entries(grouped).map(([cat, marketList]) => (
                <div key={cat} className="flex flex-col">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">{cat}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {marketList.map((m, i) => renderMarket(m, i))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ... existing code ...

// --- Component: MatchCard ---
const MatchCard = ({ match, filterHighOdds }: { match: Match, filterHighOdds?: boolean }) => {
    const router = useRouter();

    const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const strategy = e.target.value;
        if (strategy) {
            const leagueName = match.league_header?.name || match.tournament.name || "league";
            const leagueSlug = leagueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || "league";
            // Uses id2 if available, otherwise fallback to id (but API should provide id2)
            const matchIdToUse = (match as any).id2 || match.id;
            router.push(`/marketing/${leagueSlug}/${matchIdToUse}/${strategy}`);
        }
    };
    return (
        <div className="group relative w-full mb-6 max-w-2xl mx-auto">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 rounded-2xl blur opacity-20 bg-emerald-900"></div>

            {/* Card Container */}
            <div className="relative flex flex-col bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-gray-300 tracking-wider">
                            {match.league_header?.name || match.tournament.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Start Time Formatted */}
                        <span className="text-gray-400 font-mono text-xs font-bold">
                            {new Date(match.start_time).toLocaleString('es-ES', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>

                {/* Score Section */}
                <div className="flex items-center justify-between p-4 bg-[#050505]/60">
                    {/* Home */}
                    <div className="flex flex-col items-center gap-2 w-1/3">
                        <TeamLogo name={match.competitors.home.name} className="w-12 h-12" defaultColor="#10b981" />
                        <span className="text-xs font-bold text-gray-200 text-center">{match.competitors.home.name}</span>
                    </div>

                    {/* VS */}
                    <div className="text-xl font-black text-gray-500 italic px-4 py-2">
                        VS
                    </div>

                    {/* Away */}
                    <div className="flex flex-col items-center gap-2 w-1/3">
                        <TeamLogo name={match.competitors.away.name} className="w-12 h-12" defaultColor="#ef4444" />
                        <span className="text-xs font-bold text-gray-200 text-center">{match.competitors.away.name}</span>
                    </div>
                </div>

                {/* MARKETING STRATEGY SELECTOR */}
                <div className="px-4 py-3 bg-[#080808] border-t border-white/5">
                    <div className="relative">
                        <select
                            onChange={handleStrategyChange}
                            className="w-full appearance-none bg-[#111] text-xs font-bold text-gray-300 uppercase tracking-widest py-3 pl-4 pr-10 rounded-lg border border-white/10 hover:border-emerald-500/50 hover:text-white hover:bg-[#161616] focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-lg"
                            defaultValue=""
                        >
                            <option value="" disabled>🎯 Seleccionar Estrategia IA</option>
                            <option value="safe">🛡️ Apuesta Segura (Alta Probabilidad)</option>
                            <option value="medium">⚖️ Apuesta Media (Valor Óptimo)</option>
                            <option value="risky">🚀 Apuesta Arriesgada (High Yield)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* FULL ODDS SECTION */}
                <div className="border-t border-white/10">
                    <div className="bg-white/5 px-4 py-1.5 border-b border-white/5 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Full Odds Feed</span>
                    </div>

                    {/* @ts-ignore */}
                    <OddsDisplay markets={match.full_markets || match.markets || []} match={match} filterHighOdds={filterHighOdds} />
                </div>

            </div>
        </div>
    );
};


export default function TelegramPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // [NEW] State for filtering and sorting
    const [filterLeague, setFilterLeague] = useState<string>("All");
    const [sortBy, setSortBy] = useState<string>("time"); // 'time' or 'league'
    const [filterHighOdds, setFilterHighOdds] = useState<boolean>(false); // odds >= 5

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("/api/oriol-odds"); // Using the NEW endpoint
                if (!response.ok) throw new Error("Failed");
                const data = await response.json();
                setMatches(data.matches || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // 5s Refresh
        return () => clearInterval(interval);
    }, []);

    // [NEW] Derived State: Unique Leagues (using top-level `league` field)
    const uniqueLeagues = Array.from(new Set(matches.map(m => m.league || "Other"))).sort();

    // [NEW] Derived State: Filtered & Sorted Matches
    const filteredMatches = matches.filter(m => {
        // League filter
        if (filterLeague !== "All" && (m.league || "Other") !== filterLeague) return false;

        // High odds filter
        if (filterHighOdds) {
            const hasHighOdds = m.markets?.some(market =>
                market.outcomes?.some(o => o.odds && o.odds >= 5)
            );
            if (!hasHighOdds) return false;
        }

        return true;
    });

    const sortedMatches = [...filteredMatches].sort((a, b) => {
        if (sortBy === "league") {
            const leagueA = a.league || "";
            const leagueB = b.league || "";
            return leagueA.localeCompare(leagueB);
        }
        // Default: Sort by Time
        return (a.start_time || "").localeCompare(b.start_time || "");
    });

    if (isLoading && matches.length === 0) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono text-xs">
                LOADING LIVE FEED...
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white p-4 font-sans selection:bg-emerald-500/30">

            {/* [NEW] Controls Header */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-wrap gap-4 items-center justify-between bg-white/[0.03] p-4 rounded-lg border border-white/5">

                {/* League Filter */}
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Filtrar por Liga</label>
                    <select
                        value={filterLeague}
                        onChange={(e) => setFilterLeague(e.target.value)}
                        className="bg-black/50 border border-white/10 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors w-full sm:w-64"
                    >
                        <option value="All">Todas las Ligas ({matches.length})</option>
                        {uniqueLeagues.map(league => (
                            <option key={league} value={league}>
                                {league}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sort Toggle */}
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Ordenar por</label>
                    <div className="flex bg-black/50 rounded p-1 border border-white/10">
                        <button
                            onClick={() => setSortBy("time")}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${sortBy === 'time' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Hora
                        </button>
                        <button
                            onClick={() => setSortBy("league")}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${sortBy === 'league' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Liga
                        </button>
                    </div>
                </div>

                {/* High Odds Filter */}
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Cuotas Altas</label>
                    <button
                        onClick={() => setFilterHighOdds(!filterHighOdds)}
                        className={`px-4 py-2 text-xs font-bold rounded border transition-colors ${filterHighOdds ? 'bg-amber-500 text-black border-amber-500' : 'bg-black/50 text-gray-400 border-white/10 hover:text-white'}`}
                    >
                        {filterHighOdds ? '✓ Odds ≥ 5' : 'Odds ≥ 5'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                {sortedMatches.length > 0 ? (
                    sortedMatches.map(m => (
                        <MatchCard key={m.id} match={m} filterHighOdds={filterHighOdds} />
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-12 text-sm">
                        No hay partidos disponibles para esta selección.
                    </div>
                )}
            </div>
        </main>
    );
}
