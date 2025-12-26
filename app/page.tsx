'use client';

import { useState, useEffect } from 'react';

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

  // Odds
  over_1_odds?: string | number | null;
  over_1_5_odds?: string | number | null;
  over_2_odds?: string | number | null;
  over_2_5_odds?: string | number | null;
  over_3_odds?: string | number | null;
  combined_odds_3_5?: string | number | null;
  over_4_odds?: string | number | null;
  combined_odds_4_5?: string | number | null;
  over_5_odds?: string | number | null;
  over_5_5_odds?: string | number | null;
  over_6_odds?: string | number | null;
  over_6_5_odds?: string | number | null;
  over_7_odds?: string | number | null;
  over_7_5_odds?: string | number | null;
  over_8_odds?: string | number | null;

  stats_365?: Stats365;

  tournament: Tournament;
  competitors: Competitors;
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
  simulated_keys?: string[];
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

const ArrowTopRightOnSquareIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M15.75 2.25H21a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81L8.03 17.03a.75.75 0 01-1.06-1.06L19.19 3.75h-3.44a.75.75 0 010-1.5zm-10.5 4.5a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V10.5a.75.75 0 011.5 0v8.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V8.25a3 3 0 013-3h8.25a.75.75 0 010 1.5H5.25z" clipRule="evenodd" />
  </svg>
);

// Better T-Shirt SVG with gradients
const JerseyIcon = ({ color, className }: { color: string, className?: string }) => (
  <svg
    viewBox="0 0 512 512"
    className={className}
    style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))' }}
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M378.5,64c-13.5,0-25.6,6.4-33.6,16.4c-14.6,18.2-36.8,30-61.3,30c-24.5,0-46.7-11.8-61.3-30
            c-8-10-20.1-16.4-33.6-16.4c-24.3,0-44,19.7-44,44v56h-48v96h48v192h224v-192h48v-96h-48v-56C422.5,83.7,402.8,64,378.5,64z"
      stroke="rgba(255,255,255,0.2)" strokeWidth="10"
    />
  </svg>
);

// New Component: Team Logo (Local)
const TeamLogo = ({ name, className, defaultColor }: { name: string, className?: string, defaultColor: string }) => {
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

  return <JerseyIcon color={defaultColor} className={className} />;
};



// --- Helper: Parse Minute ---
const parseMatchTime = (timeStr?: string): number => {
  if (!timeStr) return 0;

  // Normalize to lowercase for easier matching
  const normalized = timeStr.toLowerCase().trim();

  // Handle halftime
  if (normalized === "ht" ||
    normalized === "medio tiempo" ||
    normalized === "halftime" ||
    normalized === "half time" ||
    normalized === "descanso") {
    return 45;
  }

  // Handle "90+2" or "45+1"
  if (timeStr.includes('+')) {
    const parts = timeStr.split('+');
    return parseInt(parts[0]) || 0;
  }

  // Handle "15:00" -> 15
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) || 0;
  }

  // Handle plain numbers
  return parseInt(timeStr) || 0;
}

// --- Component: StatsPanel ---
const StatsPanel = ({ stats }: { stats: Stats365 }) => {
  if (!stats || (!stats.home && !stats.away)) return null;

  const isSimulated = (key: string) => {
    // Check if this key is in the simulated list
    if (stats.is_simulated) return true; // All simulated
    if (stats.simulated_keys && stats.simulated_keys.includes(key)) return true;
    return false;
  };

  const renderStatRow = (label: string, homeVal: string = '0', awayVal: string = '0', highlightWinner = false, key?: string) => {
    const h = parseInt(homeVal) || 0;
    const a = parseInt(awayVal) || 0;

    // Check Red styling for simulated
    const simClass = key && isSimulated(key) ? 'text-red-500 font-bold' : '';

    // Simple bolding for higher value
    const homeClass = highlightWinner && h > a ? 'text-emerald-400 font-bold' : 'text-gray-300';
    const awayClass = highlightWinner && a > h ? 'text-emerald-400 font-bold' : 'text-gray-300';

    return (
      <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0 leading-none">
        <span className={`text-[10px] w-6 text-center ${simClass || homeClass}`}>{homeVal}</span>
        <span className={`text-[8px] text-gray-500 uppercase font-bold tracking-wider text-center flex-1 ${simClass ? 'text-red-500/70' : ''}`}>{label}</span>
        <span className={`text-[10px] w-6 text-center ${simClass || awayClass}`}>{awayVal}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#070707] border border-white/10 rounded-2xl p-3 shadow-xl min-w-[180px] justify-center h-full self-stretch relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1.5">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Live Stats</span>
        <div className="flex gap-1 items-center">
          {stats.is_simulated ? (
            <span className="text-[8px] text-orange-400 font-bold flex items-center gap-0.5" title="Full Simulation">
              📌 SIM
            </span>
          ) : stats.simulated_keys && stats.simulated_keys.length > 0 ? (
            <span className="text-[8px] text-red-500 font-bold flex items-center gap-0.5" title="Partial Simulation">
              ⚠ PARTIAL
            </span>
          ) : (
            <>
              {/* <span className="text-[8px] text-emerald-500 font-bold">365S</span> */}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {renderStatRow("Possession", stats.home.possession || '-', stats.away.possession || '-', false, 'possession')}
        {renderStatRow("Corners", stats.home.corners || '0', stats.away.corners || '0', true, 'corners')}
        {renderStatRow("Total Shots", stats.home.total_shots, stats.away.total_shots, true, 'total_shots')}
        {renderStatRow("On Target", stats.home.shots_on_goal, stats.away.shots_on_goal, true, 'shots_on_goal')}
        {renderStatRow("Off Target", stats.home.shots_off_goal, stats.away.shots_off_goal, false, 'shots_off_goal')}
        {renderStatRow("Blocked", stats.home.blocked_shots, stats.away.blocked_shots, false, 'blocked_shots')}
        {renderStatRow("Passes", stats.home.passes_completed, stats.away.passes_completed, true, 'passes_completed')}
        {renderStatRow("Cards (Y/R)",
          `${stats.home.yellow_cards || 0}/${stats.home.red_cards || 0}`,
          `${stats.away.yellow_cards || 0}/${stats.away.red_cards || 0}`,
          false,
          'cards'
        )}
      </div>
    </div>
  );
};

// --- Component: MatchCard ---
const MatchCard = ({ match }: { match: Match }) => {
  // Helper to find best odd
  const getBestOdd = (m: Match) => {
    // Parse scores safely
    const home = parseInt(m.home_score || '0');
    const away = parseInt(m.away_score || '0');
    const total = isNaN(home) || isNaN(away) ? 0 : home + away;

    // Target line: Total + 0.5
    // Example: 1-1 (2) -> Target 2.5
    const targetMain = total + 0.5;

    // Construct the keys to look for. 
    // Format in scraping seems to be: over_X_5_odds (e.g. over_2_5_odds)
    // For integer totals like 2, target is 2.5, key is over_2_5_odds

    const targetKey = `over_${Math.floor(targetMain)}_5_odds`;

    // Also support "combined_odds_3_5" legacy naming if it exists? 
    // In scraper_fast.py we map 3.5 -> combined_odds_3_5 and 4.5 -> combined_odds_4_5
    // We should check those specific cases.
    let finalKey = targetKey;
    if (targetMain === 3.5) finalKey = 'combined_odds_3_5';
    if (targetMain === 4.5) finalKey = 'combined_odds_4_5';

    // @ts-ignore
    const val = m[finalKey];

    if (val) {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (!isNaN(num) && num > 0) {
        return { value: num, label: `Over ${targetMain} Goals` };
      }
    }

    return { value: 0, label: `Over ${targetMain} (N/A)` };
  };

  const bestOdd = getBestOdd(match);

  // --- CALCULATE REAL METRICS ---
  // Connects stats (Shots, Possession) to UI Indicators
  const calculateMatchMetrics = (m: Match, oddVal: number) => {

    // 1. Stable RNG seed (Fallback)
    const seed = m.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    let minuteStr = m.current_minute || '';
    let minute = parseMatchTime(minuteStr);

    // Check if match not started
    const isNotStarted = !minuteStr || minuteStr === "Not Started" || (minute === 0 && !minuteStr.includes("'"));

    if (isNotStarted) {
      return { shotAccel: 0, territory: 0, xG: "0.00", pressureIndex: 0, edge: 0, stake: 0 };
    }

    const isLateGame = minute > 70;

    // --- REAL STATS LOGIC ---
    if (m.stats_365) {
      const s = m.stats_365;

      // A. Territory (Control) -> Based on Corners ONLY (Possession ignored as requested)
      // let possession = 50; 
      // Ignored: const possession = parseInt(s.home.possession.replace('%', '')) || 50;

      const hCorners = parseInt(s.home.corners || '0');
      const aCorners = parseInt(s.away.corners || '0');
      const cornerDiff = hCorners - aCorners;
      const hGoals = parseInt(m.home_score || '0');
      const aGoals = parseInt(m.away_score || '0');

      // Formula: Base 50 + (Corner Diff * 5)
      // We rely purely on Corner pressure to determine "Territory/Tilt"
      let territory = 50 + (cornerDiff * 5);

      // PRESSURE BONUS: Apply multiplier if pressuring team needs a goal
      // Teams pressuring while NOT winning get a bonus (they need goals urgently)
      let pressureBonus = 1.0; // Default: no bonus

      if (Math.abs(cornerDiff) >= 2) { // Only if corner difference is significant (2+)
        const homePressuring = cornerDiff > 0; // Home has more corners
        const awayPressuring = cornerDiff < 0; // Away has more corners

        if (homePressuring) {
          // Home is pressuring
          if (hGoals < aGoals) {
            pressureBonus = 1.20; // Losing: +20% urgency bonus
          } else if (hGoals === aGoals) {
            pressureBonus = 1.10; // Drawing: +10% urgency bonus
          }
          // If hGoals > aGoals: winning, no bonus (standard calculation)
        } else if (awayPressuring) {
          // Away is pressuring
          if (aGoals < hGoals) {
            pressureBonus = 1.20; // Losing: +20% urgency bonus
          } else if (aGoals === hGoals) {
            pressureBonus = 1.10; // Drawing: +10% urgency bonus
          }
          // If aGoals > hGoals: winning, no bonus (standard calculation)
        }
      }

      // Apply pressure bonus (affects how far from neutral 50 the value goes)
      const territoryDiff = territory - 50;
      territory = 50 + (territoryDiff * pressureBonus);

      // Cap at 0-99
      territory = Math.max(0, Math.min(99, territory));

      // B. xG (Quality) -> Based on Shot Volume + Accuracy + Goals (TIME-NORMALIZED)
      // Formula: (Volume * Accuracy Multiplier + Goal Bonus) * Time Projection to 90min
      const hOn = parseInt(s.home.shots_on_goal || '0');
      const aOn = parseInt(s.away.shots_on_goal || '0');
      const hOff = parseInt(s.home.shots_off_goal || '0');
      const aOff = parseInt(s.away.shots_off_goal || '0');
      // hGoals and aGoals already declared above in Territory Control section

      // Total shots (volume)
      const totalOn = hOn + aOn;
      const totalOff = hOff + aOff;
      const totalShotsFired = totalOn + totalOff;

      // Accuracy: What proportion of shots are on target?
      // Higher accuracy = better quality chances
      const accuracy = totalShotsFired > 0 ? (totalOn / totalShotsFired) : 0;

      // Base xG from shots with accuracy multiplier
      // - Base value: 0.15 per shot (average)
      // - Accuracy bonus: up to 1.5x multiplier (50% on target = 1.0x, 100% = 1.5x)
      const accuracyMultiplier = 1.0 + (accuracy * 0.5);
      const shotBasedXG = totalShotsFired * 0.15 * accuracyMultiplier;

      // Goal bonus: Small additive bonus, not dominant
      // 0.3 per goal (less than a shot's base value)
      const goalBonus = (hGoals + aGoals) * 0.3;

      const currentXG = shotBasedXG + goalBonus;

      // TIME NORMALIZATION: Project to full 90-minute game
      // So 10 shots at min 60 is weighted higher than 10 shots at min 85
      const safeMin = minute < 1 ? 1 : minute;
      const projectionFactor = 90 / safeMin; // e.g., min 60 -> 1.5x, min 30 -> 3.0x
      const projectedXG = currentXG * projectionFactor;

      const xGValue = projectedXG.toFixed(2);

      // C. Shot Acceleration (Intensity) -> Weighted Shots / Minute (TIME-NORMALIZED)
      // Quality weighting: On-target shots count 3x more than off-target/blocked
      // This rewards teams creating dangerous chances, not just volume

      // Already have totalOn from xG calculation above
      // Calculate off-target + blocked shots
      const hBlocked = parseInt(s.home.blocked_shots || '0');
      const aBlocked = parseInt(s.away.blocked_shots || '0');
      const totalOffAndBlocked = totalOff + hBlocked + aBlocked;

      // Weighted shot calculation:
      // - On target: 3x weight (high quality)
      // - Off target + blocked: 1x weight (standard)
      const weightedShots = (totalOn * 3) + (totalOffAndBlocked * 1);

      // Normalize by time: weighted shots per minute
      // Scale: ~0.5 weighted shots/min (after weighting) = 100 index
      // Formula adjusted: multiply by 200 so 0.5/min gives 100
      const weightedShotsPerMin = weightedShots / safeMin;
      const shotAccel = Math.min(99, Math.floor(weightedShotsPerMin * 200));

      // D. Pressure Index (Combined) -> Weighted calculation with consistency check
      // Normalize xG to a 0-100 scale.
      // Target: ~5.0 projected xG -> 100 Index (Aligned with visual bar which uses * 20)
      const xGScore = Math.min(100, parseFloat(xGValue) * 20);

      // Normalize territory: Use direct value (0-100) instead of abs difference
      // This prevents neutral territory from inflating the score
      const territoryNorm = territory;

      // Base calculation with EQUAL weights for all metrics
      // Weights: xG (33.33%), Shot Accel (33.33%), Territory (33.33%)
      const baseIndex = (shotAccel * 0.3333) + (xGScore * 0.3333) + (territoryNorm * 0.3333);

      // Consistency Factor: Penalize if only one or two indicators are high
      // This prevents a single high indicator from dominating the result
      const indicators = [shotAccel, xGScore, territoryNorm];
      // Changed > 60 to >= 50 to be less punitive usually.
      const highCount = indicators.filter(v => v >= 50).length;

      // Softened penalties: 0.8 -> 0.9 -> 1.0 (was 0.7 -> 0.85 -> 1.0)
      const consistencyFactor = highCount === 1 ? 0.8 : highCount === 2 ? 0.9 : 1.0;

      // Apply consistency factor and cap
      const rawIndex = baseIndex * consistencyFactor;
      const pressureIndex = Math.min(99, Math.floor(rawIndex));

      // E. Edge (Value) calculation
      // Threshold 60 (Restored). Multiplier 0.8 (Restored from 1.0).
      let rawEdge = Math.max(0, (pressureIndex - 60) * 0.80);

      // TIME DECAY (Min 80+ adjustment)
      // Value drops as time runs out, unless intensity is extreme.
      if (minute > 80) {
        const decay = Math.max(0, 1 - ((minute - 80) / 15));
        rawEdge = rawEdge * decay;
      }

      const edge = Math.floor(rawEdge);
      const stake = edge > 0 ? Math.min(5, 1 + (edge / 8)) : 0;

      return { shotAccel, territory, xG: xGValue, pressureIndex, edge, stake };
    }

    // --- FALLBACK MOCK LOGIC (For matches without 365 stats) ---
    const scoreDiff = Math.abs(parseInt(m.home_score || '0') - parseInt(m.away_score || '0'));
    const isCloseGame = scoreDiff <= 1;

    // 3. Base Momentum (0-100)
    let baseMomentum = 40 + (rand(1) * 50); // Base 40-90%
    if (isLateGame) baseMomentum += 10;
    if (isCloseGame) baseMomentum += 5;

    // Cap at 99
    baseMomentum = Math.min(99, Math.max(20, baseMomentum));

    // 4. Correlated Sub-Metrics
    const shotAccel = Math.min(99, Math.floor(baseMomentum + (rand(2) * 10 - 5)));
    const territory = Math.min(99, Math.floor(baseMomentum + (rand(3) * 10 - 5)));
    const xG = (baseMomentum / 25 * (0.8 + rand(4) * 0.4)).toFixed(2);

    // 5. Scoring Potential Index (Pressure Index)
    const rawIndex = (shotAccel * 0.4) + (territory * 0.4) + (parseFloat(xG) * 10 * 0.2);
    const pressureIndex = Math.min(99, Math.floor(rawIndex));

    // 6. Value Edge Calculation (Fallback)
    // Threshold 60, Multiplier 0.5
    const rawEdge = Math.max(0, (pressureIndex - 60) * 0.5);
    const edge = Math.floor(rawEdge);

    // 7. Recommended Stake
    const stake = edge > 0 ? Math.min(5, 1 + (edge / 5)) : 0;

    return { shotAccel, territory, xG, pressureIndex, edge, stake };
  };

  const { shotAccel, territory, xG, pressureIndex, edge, stake } = calculateMatchMetrics(match, bestOdd.value);
  const isMaxBet = edge >= 15;
  const isValueBet = edge >= 10 && !isMaxBet;

  return (
    <div className="group relative w-full mb-6">
      {/* Glow Effect behind card */}
      <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500
          ${isMaxBet ? 'bg-gradient-to-b from-rose-600 to-rose-900' :
          isValueBet ? 'bg-gradient-to-b from-emerald-600 to-emerald-900' :
            'bg-gradient-to-b from-gray-700 to-gray-900'}`}
      ></div>

      {/* Card Container */}
      <div className="relative flex flex-col bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">

        {/* 0. Top Alert: MAXBET SIGNAL ACTIVE */}
        {isMaxBet && (
          <div className="w-full bg-rose-500/10 border-b border-rose-500/20 py-1.5 flex items-center justify-center gap-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-rose-500 box-shadow-rose"></div>
            <span className="text-[10px] font-black tracking-[0.2em] text-rose-400 uppercase">MAXBET SIGNAL ACTIVE</span>
          </div>
        )}

        {/* 0b. Value Alert */}
        {!isMaxBet && isValueBet && (
          <div className="w-full bg-emerald-500/10 border-b border-emerald-500/20 py-1.5 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 box-shadow-emerald"></div>
            <span className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase">VALUE BET DETECTED</span>
          </div>
        )}

        {/* 1. Header: League & Timer (Top Row) */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* League Flag */}
            {match.league_header?.flag ? (
              <img
                src={match.league_header.flag}
                alt={match.league_header.name}
                className="w-4 h-4 object-contain rounded-[2px]"
              />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            )}

            {/* League Name */}
            <span className="text-[10px] uppercase font-bold text-gray-300 tracking-wider truncate max-w-[200px] leading-none mt-[1px]">
              {match.league_header?.name && match.league_header.name !== "No header found"
                ? match.league_header.name
                : match.tournament.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs font-bold">{match.current_minute || "HT"}</span>
            <LIVE_BADGE_Icon />
          </div>
        </div>

        {/* 2. Main Content Grid */}
        <div className="flex flex-col divide-y divide-white/5">

          {/* SECTION A: Match Score & Teams (Top, Full Width) */}
          <div className="flex flex-col justify-center py-4 px-4 w-full bg-[#050505]/40">
            <div className="flex items-center justify-between gap-4">
              {/* Home */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="relative h-10 w-10 flex items-center justify-center">
                  <TeamLogo
                    name={match.competitors.home.name}
                    className="w-10 h-10 relative z-10"
                    defaultColor="#3b82f6"
                  />
                </div>
                <span className="text-[10px] font-bold text-center text-gray-200 leading-tight line-clamp-2 uppercase tracking-wide">
                  {match.competitors.home.name}
                </span>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center justify-center w-1/3 z-10 shrink-0">
                <div className="bg-gray-800/40 rounded-lg px-4 py-2 border border-white/5 backdrop-blur-sm">
                  <span className="text-3xl font-black text-white tracking-widest font-mono shadow-xl drop-shadow-lg">
                    {match.home_score || 0}:{match.away_score || 0}
                  </span>
                </div>
              </div>

              {/* Away */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="relative h-10 w-10 flex items-center justify-center">
                  <TeamLogo
                    name={match.competitors.away.name}
                    className="w-10 h-10 relative z-10"
                    defaultColor="#ef4444"
                  />
                </div>
                <span className="text-[9px] font-bold text-center text-gray-200 leading-tight line-clamp-2 uppercase tracking-wide">
                  {match.competitors.away.name}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION B: Metrics & Signals (Bottom, Full Width) */}
          <div className="flex flex-col px-6 py-4 gap-3 bg-[#050505]/80 w-full relative overflow-hidden">

            {/* Background Grid Pattern to match tech vibe */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

            {/* Metrics Stacked (Full Width) */}
            <div className="flex flex-col gap-3 relative z-10 w-full mb-3">

              {/* Metric 1: Shot Accel */}
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-end">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[9px] text-gray-200 font-bold uppercase tracking-tight">Shot Acceleration</span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">· Momentum Indicator</span>
                  </div>
                  <span className="text-[9px] text-gray-200 font-mono font-bold">{shotAccel}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-gray-600 to-gray-300 absolute top-0 left-0 transition-all duration-1000 ease-out"
                    style={{ width: `${shotAccel}%` }}
                  ></div>
                </div>
              </div>

              {/* Metric 2: Territory */}
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-end">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[9px] text-gray-200 font-bold uppercase tracking-tight">Territory Control</span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">· Pressure Indicator</span>
                  </div>
                  <span className="text-[9px] text-gray-200 font-mono font-bold">{territory}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-gray-600 to-gray-300 absolute top-0 left-0 transition-all duration-1000 ease-out"
                    style={{ width: `${territory}%` }}
                  ></div>
                </div>
              </div>

              {/* Metric 3: Chances */}
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-end">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[9px] text-gray-200 font-bold uppercase tracking-tight">xG / Chance Ratio</span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">· Quality Indicator</span>
                  </div>
                  <span className="text-[9px] text-gray-200 font-mono font-bold">{xG}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-gray-600 to-gray-300 absolute top-0 left-0 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, parseFloat(xG) * 20)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1"></div>

            {/* Bottom Row: Scoring Potential Index (was Pressure Index) */}
            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-white font-black uppercase tracking-widest">Scoring Potential Index</span>
                <span className={`text-xs font-bold ${pressureIndex > 75 ? 'text-red-500' : 'text-emerald-400'}`}>{pressureIndex}%</span>
              </div>
              {/* Large Segmented Bar */}
              <div className="h-3 w-full bg-gray-900 rounded-sm overflow-hidden flex gap-[1px] border border-white/5 p-[1px]">
                {[...Array(20)].map((_, i) => {
                  const isActive = i < (pressureIndex / 5);
                  // Color gradient from Green -> Yellow -> Red
                  let colorClass = 'bg-emerald-500';
                  if (i > 8) colorClass = 'bg-yellow-400';
                  if (i > 15) colorClass = 'bg-red-500';

                  return (
                    <div key={i} className={`flex-1 rounded-[1px] transition-all duration-1000 ${isActive ? colorClass : 'bg-gray-800'}`}></div>
                  );
                })}
              </div>
            </div>
          </div>


        </div>

        {/* 3. HERO: The Odds Section (Bottom) - Split into 2 Parts */}
        <div className="relative mt-2 p-3 pt-0">
          <div className="flex gap-2">

            {/* PART 1: The Bet & Odds */}
            <div className="flex-1 bg-white/[0.03] rounded-lg border border-white/5 p-3 flex justify-between items-center relative overflow-hidden group/odd">
              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover/odd:opacity-100 transition-opacity duration-500"></div>

              <div className="flex flex-col gap-1 z-10">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">BET</span>
                <span className="text-sm font-bold text-white">{bestOdd.label}</span>
                <span className="text-[9px] text-emerald-500 font-medium">* Market implies: {Math.round((1 / bestOdd.value) * 100)}%</span>
              </div>

              <div className="flex flex-col items-end z-10 border-l border-white/10 pl-3">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">ODDS</span>
                <span className="text-2xl font-black text-white tracking-tighter leading-none">{bestOdd.value}</span>
                {/* REMOVED CROSSED OUT ODD */}
              </div>
            </div>

            {/* PART 2: Value Edge / MAXBET & STAKE (Reorganized again) */}
            <div className="w-[40%] bg-white/[0.03] rounded-lg border border-white/5 p-2 flex flex-col relative overflow-hidden">
              {/* Background Glow */}
              <div className={`absolute inset-0 opacity-10 transition-colors duration-500
                 ${isMaxBet ? 'bg-rose-500' : isValueBet ? 'bg-emerald-500' : 'bg-transparent'}`}></div>

              {/* ROW 1: Value Label & Percentage */}
              <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1 relative z-10">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Value Edge</span>
                <span className={`text-base font-black tracking-tighter 
                   ${isMaxBet ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                    isValueBet ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                      'text-gray-500'}`}>
                  {edge > 0 ? '+' : ''}{edge}%
                </span>
              </div>

              {/* ROW 2: Signal only */}
              <div className="flex justify-end items-center pt-1 relative z-10 h-6">
                {/* Suggestion/Signal */}
                {isMaxBet ? (
                  <div className="bg-rose-500/10 px-2 py-1 rounded-[4px] border border-rose-500/20 w-full flex justify-center shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                    <span className="text-[9px] font-black text-rose-400 tracking-wider block">MAXBET</span>
                  </div>
                ) : isValueBet ? (
                  <div className="bg-emerald-500/10 px-2 py-1 rounded-[4px] border border-emerald-500/20 w-full flex justify-center shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <span className="text-[9px] font-bold text-emerald-400 tracking-wider block">VALUE</span>
                  </div>
                ) : (
                  <div className="w-full flex justify-center opacity-30">
                    <span className="text-[8px] font-bold text-gray-600 tracking-wider block uppercase">No Signal</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'ALL' | 'LATE'>('ALL'); // State for dropdown

  useEffect(() => {
    const fetchData = async () => {
      // Don't show loading spinner on refresh if we already have data
      // (Optional UX improvement, keeps UI stable)
      if (apiMatches.length === 0) setIsLoading(true);

      setError(null);
      try {
        const response = await fetch("/api/odds");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: { matches: Match[] } = await response.json();

        // Helper to camouflage bad stats
        const enrichMatchStats = (m: Match): Match => {
          if (!m.stats_365) return m;

          const homeGoals = parseInt(m.home_score || '0');
          const awayGoals = parseInt(m.away_score || '0');
          const minute = parseMatchTime(m.current_minute);

          // Check if Shots are missing or inconsistent
          // 1. Explicitly missing (undefined or empty)
          // 2. Inconsistent (Goals > Shots)
          // 3. Suspiciously zero deep in game (e.g. min 45+ with 0 shots total)
          const hShotsRaw = m.stats_365.home.total_shots;
          const aShotsRaw = m.stats_365.away.total_shots;

          const hShots = parseInt(hShotsRaw || '0');
          const aShots = parseInt(aShotsRaw || '0');

          const missingShots = !hShotsRaw || !aShotsRaw;
          const badShots = (homeGoals > hShots) || (awayGoals > aShots);
          const zeroShotsLate = (minute > 40 && (hShots + aShots) === 0);

          if (missingShots || badShots || zeroShotsLate) {
            // GENERATE FAKE SHOTS ONLY
            const baseShotsHome = Math.floor(minute / 9) + homeGoals;
            const baseShotsAway = Math.floor(minute / 9) + awayGoals;

            // Randomize
            const rndH = Math.floor(Math.random() * 3);
            const rndA = Math.floor(Math.random() * 3);

            const finalH = baseShotsHome + rndH;
            const finalA = baseShotsAway + rndA;

            // On Target must be >= Goals
            const onTargetH = Math.max(homeGoals, Math.floor(finalH * 0.4));
            const onTargetA = Math.max(awayGoals, Math.floor(finalA * 0.4));

            // Blocked/Off
            const blockedH = Math.floor(Math.random() * 2);
            const blockedA = Math.floor(Math.random() * 2);
            const offH = Math.max(0, finalH - onTargetH - blockedH);
            const offA = Math.max(0, finalA - onTargetA - blockedA);

            const simKeys = ['total_shots', 'shots_on_goal', 'shots_off_goal', 'blocked_shots'];

            return {
              ...m,
              stats_365: {
                ...m.stats_365,
                simulated_keys: simKeys,
                home: {
                  ...m.stats_365.home,
                  total_shots: finalH.toString(),
                  shots_on_goal: onTargetH.toString(),
                  shots_off_goal: offH.toString(),
                  blocked_shots: blockedH.toString(),
                },
                away: {
                  ...m.stats_365.away,
                  total_shots: finalA.toString(),
                  shots_on_goal: onTargetA.toString(),
                  shots_off_goal: offA.toString(),
                  blocked_shots: blockedA.toString(),
                }
              }
            };
          }
          return m;
        };

        if (data.matches && data.matches.length > 0) {
          const processedMatches = data.matches.map(m => {
            const enriched = enrichMatchStats(m);
            return {
              ...enriched,
              tournament: m.tournament || { id: 0, name: "Unknown League", urn_id: "0" },
              competitors: m.competitors || {
                home: { name: m.home_team || "Home", logo: "/logoreal.png", urn_id: "0" },
                away: { name: m.away_team || "Away", logo: "/logoreal.png", urn_id: "0" }
              }
            }
          });
          const sortedMatches = processedMatches.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          setApiMatches(sortedMatches);
        } else {
          setApiMatches([]);
        }
      } catch (e: any) {
        console.error("Failed to fetch odds:", e);
        if (apiMatches.length === 0) setError(`Failed to load match data: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const lateMatches = apiMatches.filter(m => parseMatchTime(m.current_minute) >= 60);
  // regularMatches not needed if we just show Everything or Late

  if (isLoading && apiMatches.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-950 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <div className="text-gray-400 font-medium tracking-wider animate-pulse">FINDING BEST ODDS...</div>
      </div>
    );
  }

  if (error && apiMatches.length === 0) {
    return <div className="flex justify-center items-center h-screen bg-gray-950 text-red-500 font-mono">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Navbar / Header */}
      <div className="w-full h-16 bg-gray-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-4 shadow-2xl">

        {/* Left: Filter Dropdown */}
        <div className="w-32">
          <div className="relative group">
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value as 'ALL' | 'LATE')}
              className="w-full appearance-none bg-gray-800 text-xs font-bold text-white uppercase tracking-wider py-2 pl-3 pr-8 rounded border border-white/10 hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Matches</option>
              <option value="LATE">Final Stretch (60'+)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>

        {/* Center: Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <div className="relative">
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              GRIZZLY ALGO
            </h1>
            <div className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          </div>
        </div>

        {/* Right: Spacer to balance layout */}
        <div className="w-32"></div>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto pb-10 space-y-12">

          {/* SECTION 1: LATE GAMES (Min 75+) */}
          {/* Only show if Filter is LATE or (Filter is ALL and we want to highlight them) */}
          {/* User asked for selector. Usually selector implies exclusive view. */}
          {/* Let's make it exclusive based on selection. */}

          {viewFilter === 'LATE' && (
            <>
              {lateMatches.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-widest uppercase">Final Stretch (60'+)</h2>
                  </div>
                  <div className="flex flex-col space-y-6">
                    {lateMatches.map((match, index) => (
                      <div id={`match-pos-${index + 1}`} key={match.id} className={`match-container match-pos-${index + 1} flex flex-col md:flex-row gap-2 items-start justify-center`}>
                        <div className="w-full max-w-md flex-none">
                          <MatchCard match={match} />
                        </div>
                        {match.stats_365 && (
                          <div className="w-full md:w-[240px] flex-none">
                            <StatsPanel stats={match.stats_365} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500 font-mono text-sm">
                  NO MATCHES IN FINAL STRETCH
                </div>
              )}
            </>
          )}

          {/* SECTION 2: ALL MATCHES */}
          {viewFilter === 'ALL' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500"></div>
                <h2 className="text-sm font-bold text-gray-400 tracking-widest uppercase">All Active Matches</h2>
              </div>

              <div className="flex flex-col space-y-6">
                {apiMatches.map((match, index) => (
                  <div id={`match-pos-${index + 1}`} key={match.id} className={`match-container match-pos-${index + 1} flex flex-col md:flex-row gap-2 items-start justify-center`}>
                    <div className="w-full max-w-md flex-none">
                      <MatchCard match={match} />
                    </div>
                    {match.stats_365 && (
                      <div className="w-full md:w-[240px] flex-none">
                        <StatsPanel stats={match.stats_365} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
