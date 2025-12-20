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
  // Handle "HT"
  if (timeStr === "HT") return 45;

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

  const renderStatRow = (label: string, homeVal: string = '0', awayVal: string = '0', highlightWinner = false) => {
    const h = parseInt(homeVal) || 0;
    const a = parseInt(awayVal) || 0;
    // Simple bolding for higher value
    const homeClass = highlightWinner && h > a ? 'text-emerald-400 font-bold' : 'text-gray-300';
    const awayClass = highlightWinner && a > h ? 'text-emerald-400 font-bold' : 'text-gray-300';

    return (
      <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0 leading-none">
        <span className={`text-[10px] w-6 text-center ${homeClass}`}>{homeVal}</span>
        <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider text-center flex-1">{label}</span>
        <span className={`text-[10px] w-6 text-center ${awayClass}`}>{awayVal}</span>
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
            <span className="text-[8px] text-orange-400 font-bold flex items-center gap-0.5" title="Simulated Data">
              📌 SIM
            </span>
          ) : (
            <>
              <span className="text-[8px] text-emerald-500 font-bold">365S</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {renderStatRow("Possession", stats.home.possession || '-', stats.away.possession || '-')}
        {renderStatRow("Corners", stats.home.corners || '0', stats.away.corners || '0', true)}
        {renderStatRow("Total Shots", stats.home.total_shots, stats.away.total_shots, true)}
        {renderStatRow("On Target", stats.home.shots_on_goal, stats.away.shots_on_goal, true)}
        {renderStatRow("Off Target", stats.home.shots_off_goal, stats.away.shots_off_goal)}
        {renderStatRow("Blocked", stats.home.blocked_shots, stats.away.blocked_shots)}
        {renderStatRow("Passes", stats.home.passes_completed, stats.away.passes_completed, true)}
        {renderStatRow("Cards (Y/R)",
          `${stats.home.yellow_cards || 0}/${stats.home.red_cards || 0}`,
          `${stats.away.yellow_cards || 0}/${stats.away.red_cards || 0}`
        )}
      </div>
    </div>
  );
};

// --- Component: MatchCard ---
const MatchCard = ({ match }: { match: Match }) => {
  // Helper to find best odd
  const getBestOdd = (m: Match) => {
    const lines = [
      { key: 'over_2_5_odds', label: 'Over 2.5 Goals' },
      { key: 'over_1_5_odds', label: 'Over 1.5 Goals' },
      { key: 'combined_odds_3_5', label: 'Over 3.5 Goals' },
      { key: 'over_0_5_odds', label: 'Over 0.5 Goals' },
      { key: 'combined_odds_4_5', label: 'Over 4.5 Goals' },
      { key: 'over_1_odds', label: 'Over 1.0 Goals' },
      { key: 'over_2_odds', label: 'Over 2.0 Goals' },
      { key: 'over_3_odds', label: 'Over 3.0 Goals' },
      { key: 'over_4_odds', label: 'Over 4.0 Goals' },
      { key: 'over_5_5_odds', label: 'Over 5.5 Goals' },
    ];
    for (const line of lines) {
      // @ts-ignore
      const val = m[line.key];
      if (val) {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (!isNaN(num) && num > 0) return { value: num, label: line.label };
      }
    }
    return { value: 0, label: 'Markets Closed' };
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

      // A. Territory (Control) -> Based on Possession + Corner Difference
      let possession = 50;
      if (s.home.possession) {
        possession = parseInt(s.home.possession.replace('%', '')) || 50;
      }

      const hCorners = parseInt(s.home.corners || '0');
      const aCorners = parseInt(s.away.corners || '0');
      const cornerDiff = hCorners - aCorners;

      // Formula: Possession +/- (Corner Diff * 4)
      // Balanced weight: Significant but not overwhelming.
      let territory = possession + (cornerDiff * 4);
      territory = Math.max(0, Math.min(100, territory));

      // B. xG (Quality) -> Based on Shots (On/Off) + Goals
      // User Logic: "Too strict" -> We add Off-Target shots and boost weights.
      const hOn = parseInt(s.home.shots_on_goal || '0');
      const aOn = parseInt(s.away.shots_on_goal || '0');
      const hOff = parseInt(s.home.shots_off_goal || '0');
      const aOff = parseInt(s.away.shots_off_goal || '0');
      const hGoals = parseInt(m.home_score || '0');
      const aGoals = parseInt(m.away_score || '0');

      // Balanced Weights:
      // - Goal: 0.75
      // - On Target: 0.4
      // - Off Target: 0.1
      const rawXG = ((hOn + aOn) * 0.4) + ((hOff + aOff) * 0.1) + ((hGoals + aGoals) * 0.75);
      const xGValue = rawXG.toFixed(2);

      // C. Shot Acceleration (Intensity) -> Total Shots / Minute
      const totalShots = parseInt(s.home.total_shots || '0') + parseInt(s.away.total_shots || '0');
      const safeMin = minute < 1 ? 1 : minute;

      // Ratio: shots per minute. 
      // Scale: 100 index = 1.0 shots/min is high intensity but achievable.
      // Adjusted: 1.0 shot/min = 120 index.
      const shotsPerMin = totalShots / safeMin;
      const shotAccel = Math.min(99, Math.floor(shotsPerMin * 120));

      // D. Pressure Index (Combined) -> Weighted calculation
      // Normalize xG to a 0-100 scale. 
      // 2.5 xG -> 100 Index. (Previous 5.0 was too hard to reach).
      const xGScore = Math.min(100, parseFloat(xGValue) * 40);

      const territoryIntensity = Math.abs(territory - 50) * 2;

      // Weights: Accel (45%), xG (35%), Territory (20%) + Flat Bonus
      // +5 Base Bonus (Middle ground)
      const rawIndex = (shotAccel * 0.45) + (xGScore * 0.35) + (territoryIntensity * 0.20) + 5;
      const pressureIndex = Math.min(99, Math.floor(rawIndex));

      // E. Edge (Value) calculation
      // Threshold 60 (Strict).
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

    // 6. Value Edge Calculation
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

          // Check Inconsistency: Goals > 0 BUT Shots < Goals (Impossible)
          // Or suspiciously low shots deep in game (e.g. min 50, 0 shots)
          const hShots = parseInt(m.stats_365.home.total_shots || '0');
          const aShots = parseInt(m.stats_365.away.total_shots || '0');

          // "No, al revés": User implies Equal is VALID. So only simulate if STRICTLY LESS.
          const isBadStats = (homeGoals > 0 && hShots < homeGoals) ||
            (awayGoals > 0 && aShots < awayGoals) ||
            (minute > 40 && (hShots + aShots) === 0);

          if (isBadStats) {
            // GENERATE FAKE STATS
            // Base: roughly 1 shot every 6-8 mins is plausible average?
            // Let's be conservative: 1 shot every 9 mins
            const baseShotsHome = Math.floor(minute / 9) + homeGoals;
            const baseShotsAway = Math.floor(minute / 9) + awayGoals;

            // Corners: approx 1 every 10-12 mins per team avg?
            const baseCornHome = Math.floor(minute / 12) + (homeGoals > awayGoals ? 1 : 0);
            const baseCornAway = Math.floor(minute / 12) + (awayGoals > homeGoals ? 1 : 0);

            // Add randomness
            const rndH = Math.floor(Math.random() * 3);
            const rndA = Math.floor(Math.random() * 3);

            const finalH = baseShotsHome + rndH;
            const finalA = baseShotsAway + rndA;

            // On Target must be >= Goals
            const onTargetH = Math.max(homeGoals, Math.floor(finalH * 0.4));
            const onTargetA = Math.max(awayGoals, Math.floor(finalA * 0.4));

            return {
              ...m,
              stats_365: {
                is_simulated: true,
                home: {
                  ...m.stats_365!.home,
                  total_shots: finalH.toString(),
                  shots_on_goal: onTargetH.toString(),
                  shots_off_goal: (finalH - onTargetH).toString(),
                  passes_completed: (minute * 3 + Math.floor(Math.random() * 50)).toString(),
                  possession: '50%',
                  corners: (baseCornHome + Math.floor(Math.random() * 2)).toString()
                },
                away: {
                  ...m.stats_365!.away,
                  total_shots: finalA.toString(),
                  shots_on_goal: onTargetA.toString(),
                  shots_off_goal: (finalA - onTargetA).toString(),
                  passes_completed: (minute * 3 + Math.floor(Math.random() * 50)).toString(),
                  possession: '50%',
                  corners: (baseCornAway + Math.floor(Math.random() * 2)).toString()
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

  const lateMatches = apiMatches.filter(m => parseMatchTime(m.current_minute) >= 75);
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
              <option value="LATE">Final Stretch (75'+)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>

        {/* Center: Logo */}
        <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          <div className="h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            BETLY<span className="text-emerald-500">.LIVE</span>
          </h1>
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
                    <h2 className="text-lg font-bold text-white tracking-widest uppercase">Final Stretch (75'+)</h2>
                  </div>
                  <div className="flex flex-col space-y-6">
                    {lateMatches.map(match => (
                      <div key={match.id} className="flex flex-col md:flex-row gap-2 items-start justify-center">
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
                {apiMatches.map(match => (
                  <div key={match.id} className="flex flex-col md:flex-row gap-2 items-start justify-center">
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
