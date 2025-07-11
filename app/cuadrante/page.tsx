'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// --- Data Structure Interface ---
interface TeamStats {
  name: string;
  logo: string;
  // Corners For
  for_over4_5: number;
  for_over2_5: number;
  for_over3_5: number;
  for_over5_5: number;
  for_over6_5: number;
  for_over7_5: number;
  for_over8_5: number;
  for_average: number;
  avg_corners_for: number; // Average corners scored
  // Corners Against
  against_over4_5: number;
  against_over2_5: number;
  against_over3_5: number;
  against_over5_5: number;
  against_over6_5: number;
  against_over7_5: number;
  against_over8_5: number;
  against_average: number;
  avg_corners_against: number; // Average corners conceded
  // Total Corners
  mp: number;
  total_over9_5: number;
  total_over7_5: number;
  total_over8_5: number;
  total_over10_5: number;
  total_over11_5: number;
  total_over12_5: number;
  total_over13_5: number;
  total_average: number;
  // Total Corners Home
  mp_home: number;
  total_home_over9_5: number;
  total_home_over7_5: number;
  total_home_over8_5: number;
  total_home_over10_5: number;
  total_home_over11_5: number;
  total_home_over12_5: number;
  total_home_over13_5: number;
  total_home_average: number;
  // Total Corners Away
  mp_away: number;
  total_away_over9_5: number;
  total_away_over7_5: number;
  total_away_over8_5: number;
  total_away_over10_5: number;
  total_away_over11_5: number;
  total_away_over12_5: number;
  total_away_over13_5: number;
  total_away_average: number;
}

const defaultLogo = "/arsenal.png"; // Default logo if not found

// --- Sample Data for Premier League Teams ---
const premierLeagueTeamsData = [
  { name: 'Arsenal', logo: "/arsenal.png" },
  { name: 'Manchester City', logo: "/city.png" },
  { name: 'Liverpool', logo: "/liverpool.png" },
  { name: 'Manchester United', logo: "/580b57fcd9996e24bc43c4e7.png" },
  { name: 'Tottenham Hotspur', logo: "/580b57fcd9996e24bc43c4ee.png" },
  { name: 'Chelsea', logo: "/chelsea.png" },
  { name: 'Newcastle United', logo: "/580b57fcd9996e24bc43c4ec.png" },
  { name: 'Brighton & Hove Albion', logo: "/bb.png" },
  { name: 'Aston Villa', logo: "/580b57fcd9996e24bc43c4e4.png" },
  { name: 'West Ham United', logo: "/580b57fcd9996e24bc43c4f1.png" },
  { name: 'Fulham', logo: "/ful.png" },
  { name: 'Crystal Palace', logo: "/580b57fcd9996e24bc43c4e2.png" },
  { name: 'Brentford', logo: "/b.png" },
  { name: 'Everton', logo: "/580b57fcd9996e24bc43c4e3.png" },
  { name: 'Wolverhampton Wanderers', logo: "/ww.png" },
  { name: 'Nottingham Forest', logo: "/nf.png" },
  { name: 'Bournemouth', logo: "/580b57fcd9996e24bc43c4de.png" },
  { name: 'Burnley', logo: "/br.png" },
  { name: 'Sheffield United', logo: "/sh.png" },
  { name: 'Luton Town', logo: "/lll.png" },
  // New teams from image
  { name: 'Ipswich Town', logo: "/is.png" },
  { name: 'Southampton', logo: "/s.png" },
  { name: 'Leicester City', logo: "/lc.png" },
];

const cornersForOrder = [
    'Bournemouth',
    'Arsenal',
    'Tottenham Hotspur',
    'Liverpool',
    'Manchester City',
    'Aston Villa',
    'Newcastle United',
    'Chelsea',
    'Fulham',
    'Brighton & Hove Albion',
    'Crystal Palace',
    'Manchester United',
    'Everton',
    'Brentford',
    'Wolverhampton Wanderers',
    'West Ham United',
    'Southampton',
    'Leicester City',
    'Nottingham Forest',
    'Ipswich Town',
];

const cornersAgainstOrder = [
    'Nottingham Forest',
    'Everton',
    'Ipswich Town',
    'Brentford',
    'Southampton',
    'Leicester City',
    'Tottenham Hotspur',
    'Fulham',
    'Wolverhampton Wanderers',
    'Newcastle United',
    'Crystal Palace',
    'West Ham United',
    'Manchester United',
    'Brighton & Hove Albion',
    'Bournemouth',
    'Aston Villa',
    'Chelsea',
    'Liverpool',
    'Manchester City',
    'Arsenal',
];

const totalCornersHomeOrder = [
    'Tottenham Hotspur',
    'Newcastle United',
    'Ipswich Town',
    'Bournemouth',
    'Southampton',
    'Liverpool',
    'Manchester City',
    'Brentford',
    'Wolverhampton Wanderers',
    'West Ham United',
    'Nottingham Forest',
    'Everton',
    'Leicester City',
    'Fulham',
    'Crystal Palace',
    'Brighton & Hove Albion',
    'Aston Villa',
    'Arsenal',
    'Manchester United',
    'Chelsea',
];

const totalCornersAwayOrder = [
    'Brentford',
    'Tottenham Hotspur',
    'Ipswich Town',
    'Southampton',
    'Brighton & Hove Albion',
    'Aston Villa',
    'Everton',
    'Newcastle United',
    'Bournemouth',
    'Nottingham Forest',
    'Arsenal',
    'Manchester United',
    'Chelsea',
    'Liverpool',
    'Wolverhampton Wanderers',
    'Fulham',
    'Crystal Palace',
    'Manchester City',
    'West Ham United',
    'Leicester City',
];

const cornersForData: Record<string, number[]> = {
    'Bournemouth': [38, 68, 95, 82, 61, 37, 24, 18, 6.00],
    'Arsenal': [38, 68, 84, 71, 53, 45, 42, 28, 6.61],
    'Tottenham Hotspur': [38, 66, 92, 79, 55, 47, 32, 24, 6.39],
    'Liverpool': [38, 66, 92, 74, 57, 45, 39, 32, 6.63],
    'Manchester City': [38, 63, 89, 79, 55, 50, 39, 24, 6.66],
    'Aston Villa': [38, 61, 84, 76, 50, 34, 32, 26, 6.05],
    'Newcastle United': [38, 57, 87, 79, 45, 45, 26, 21, 5.71],
    'Chelsea': [38, 57, 100, 82, 47, 42, 32, 21, 6.16],
    'Fulham': [38, 57, 84, 68, 47, 34, 21, 13, 5.34],
    'Brighton & Hove Albion': [38, 50, 79, 68, 39, 32, 21, 16, 4.95],
    'Crystal Palace': [38, 50, 79, 66, 39, 24, 13, 0, 4.50],
    'Manchester United': [38, 50, 76, 68, 32, 32, 26, 21, 5.18],
    'Everton': [38, 47, 66, 53, 24, 16, 8, 3, 4.05],
    'Brentford': [38, 45, 84, 66, 26, 16, 8, 8, 4.58],
    'Wolverhampton Wanderers': [38, 45, 66, 53, 24, 18, 8, 3, 3.92],
    'West Ham United': [38, 42, 66, 45, 26, 16, 13, 8, 3.97],
    'Southampton': [38, 39, 61, 53, 21, 18, 13, 8, 4.00],
    'Leicester City': [38, 37, 61, 53, 26, 3, 3, 3, 3.66],
    'Nottingham Forest': [38, 32, 74, 55, 28, 21, 11, 8, 4.18],
    'Ipswich Town': [38, 28, 66, 57, 18, 11, 8, 5, 3.82],
};

const cornersAgainstData: Record<string, number[]> = {
    'Nottingham Forest': [38, 79, 97, 89, 61, 47, 28, 16, 6.32],
    'Everton': [38, 71, 89, 82, 47, 37, 34, 18, 6.03],
    'Ipswich Town': [38, 68, 82, 74, 57, 50, 37, 28, 6.55],
    'Brentford': [38, 66, 97, 84, 45, 39, 34, 26, 6.37],
    'Southampton': [38, 63, 76, 74, 61, 39, 32, 24, 6.37],
    'Leicester City': [38, 61, 84, 76, 45, 34, 24, 24, 6.05],
    'Tottenham Hotspur': [38, 57, 79, 74, 39, 32, 28, 21, 5.42],
    'Fulham': [38, 57, 79, 68, 34, 21, 8, 3, 4.53],
    'Wolverhampton Wanderers': [38, 55, 92, 79, 42, 32, 24, 18, 5.71],
    'Newcastle United': [38, 53, 79, 66, 50, 32, 21, 13, 5.32],
    'Crystal Palace': [38, 53, 87, 76, 45, 39, 32, 16, 5.63],
    'West Ham United': [38, 53, 87, 68, 42, 34, 24, 16, 5.47],
    'Manchester United': [38, 50, 79, 61, 39, 26, 16, 8, 4.79],
    'Brighton & Hove Albion': [38, 47, 76, 68, 37, 28, 18, 13, 4.79],
    'Bournemouth': [38, 42, 76, 53, 39, 32, 26, 24, 4.84],
    'Aston Villa': [38, 42, 74, 55, 32, 24, 18, 13, 4.53],
    'Chelsea': [38, 34, 66, 50, 18, 3, 0, 0, 3.66],
    'Liverpool': [38, 28, 63, 45, 18, 16, 8, 8, 3.66],
    'Manchester City': [38, 28, 63, 45, 8, 5, 3, 0, 3.24],
    'Arsenal': [38, 21, 57, 39, 16, 13, 3, 0, 3.11],
};

const totalCornersHomeData: Record<string, number[]> = {
    'Tottenham Hotspur': [19, 84, 95, 89, 68, 63, 53, 37, 12.74],
    'Newcastle United': [19, 74, 89, 89, 57, 42, 42, 21, 11.53],
    'Ipswich Town': [19, 68, 79, 74, 53, 32, 11, 11, 9.95],
    'Bournemouth': [19, 68, 74, 74, 57, 47, 37, 26, 11.26],
    'Southampton': [19, 63, 68, 68, 57, 47, 37, 21, 10.37],
    'Liverpool': [19, 63, 74, 74, 53, 37, 32, 21, 10.58],
    'Manchester City': [19, 63, 79, 74, 47, 32, 16, 5, 9.74],
    'Brentford': [19, 57, 84, 79, 42, 26, 26, 11, 10.43],
    'Wolverhampton Wanderers': [19, 57, 74, 68, 37, 16, 11, 5, 9.53],
    'West Ham United': [19, 57, 68, 57, 53, 26, 16, 11, 9.47],
    'Nottingham Forest': [19, 53, 89, 74, 37, 26, 21, 16, 10.16],
    'Everton': [19, 53, 63, 63, 47, 26, 21, 11, 9.58],
    'Leicester City': [19, 53, 68, 63, 42, 32, 26, 16, 9.79],
    'Fulham': [19, 53, 74, 63, 47, 26, 16, 16, 9.68],
    'Crystal Palace': [19, 53, 79, 74, 53, 32, 26, 26, 10.63],
    'Brighton & Hove Albion': [19, 53, 74, 63, 32, 16, 16, 5, 9.16],
    'Aston Villa': [19, 53, 84, 63, 47, 37, 37, 37, 10.79],
    'Arsenal': [19, 53, 74, 74, 37, 32, 32, 26, 10.21],
    'Manchester United': [19, 47, 68, 47, 47, 21, 16, 11, 9.27],
    'Chelsea': [19, 47, 68, 63, 37, 32, 21, 16, 9.89],
};

const totalCornersAwayData: Record<string, number[]> = {
    'Brentford': [19, 74, 89, 84, 74, 42, 42, 26, 11.47],
    'Tottenham Hotspur': [19, 68, 84, 74, 53, 37, 32, 26, 10.89],
    'Ipswich Town': [19, 68, 79, 79, 57, 32, 26, 21, 10.79],
    'Southampton': [19, 68, 79, 74, 42, 37, 37, 21, 10.37],
    'Brighton & Hove Albion': [19, 68, 79, 79, 47, 26, 21, 11, 10.32],
    'Aston Villa': [19, 68, 74, 68, 53, 32, 26, 16, 10.36],
    'Everton': [19, 63, 84, 68, 42, 42, 26, 16, 10.57],
    'Newcastle United': [19, 57, 63, 63, 53, 32, 32, 32, 10.52],
    'Bournemouth': [19, 57, 84, 74, 42, 37, 21, 16, 10.42],
    'Nottingham Forest': [19, 57, 100, 79, 47, 42, 32, 21, 10.84],
    'Arsenal': [19, 57, 57, 57, 42, 26, 16, 5, 9.21],
    'Manchester United': [19, 57, 84, 79, 42, 37, 37, 26, 10.68],
    'Chelsea': [19, 57, 79, 79, 47, 21, 5, 5, 9.73],
    'Liverpool': [19, 53, 74, 63, 53, 42, 21, 16, 10.00],
    'Wolverhampton Wanderers': [19, 53, 74, 74, 37, 21, 16, 5, 9.73],
    'Fulham': [19, 53, 79, 68, 42, 26, 26, 21, 10.05],
    'Crystal Palace': [19, 53, 74, 68, 53, 26, 16, 5, 9.63],
    'Manchester City': [19, 47, 68, 57, 47, 26, 26, 21, 10.06],
    'West Ham United': [19, 47, 57, 53, 47, 37, 32, 16, 9.42],
    'Leicester City': [19, 42, 63, 53, 32, 26, 21, 21, 9.63],
};

const totalCornersData: Record<string, number[]> = {
    'Tottenham Hotspur': [38, 76, 89, 82, 61, 50, 42, 32, 11.81],
    'Ipswich Town': [38, 68, 79, 76, 55, 32, 18, 16, 10.37],
    'Southampton': [38, 66, 74, 71, 50, 42, 37, 21, 10.37],
    'Newcastle United': [38, 66, 76, 76, 55, 37, 37, 26, 11.03],
    'Brentford': [38, 66, 87, 82, 57, 34, 34, 18, 10.95],
    'Bournemouth': [38, 63, 79, 74, 50, 42, 28, 21, 10.84],
    'Aston Villa': [38, 61, 79, 66, 50, 34, 32, 26, 10.58],
    'Brighton & Hove Albion': [38, 61, 76, 71, 39, 21, 18, 8, 9.74],
    'Everton': [38, 57, 74, 66, 45, 34, 24, 13, 10.08],
    'Liverpool': [38, 57, 74, 68, 53, 39, 26, 18, 10.29],
    'Arsenal': [38, 55, 66, 66, 39, 28, 24, 16, 9.72],
    'Manchester City': [38, 55, 74, 66, 47, 28, 21, 13, 9.90],
    'Nottingham Forest': [38, 55, 95, 76, 42, 34, 26, 18, 10.50],
    'Wolverhampton Wanderers': [38, 55, 74, 71, 37, 18, 13, 5, 9.63],
    'Crystal Palace': [38, 53, 76, 71, 53, 28, 21, 16, 10.13],
    'Manchester United': [38, 53, 76, 63, 45, 28, 26, 18, 9.97],
    'Chelsea': [38, 53, 74, 71, 42, 26, 13, 11, 9.82],
    'West Ham United': [38, 53, 63, 55, 50, 32, 24, 13, 9.44],
    'Fulham': [38, 53, 76, 66, 45, 26, 21, 18, 9.87],
    'Leicester City': [38, 47, 66, 57, 37, 28, 24, 18, 9.71],
};

const premierLeagueTeams: TeamStats[] = premierLeagueTeamsData.map(team => {
    const realForData = cornersForData[team.name] || [0,0,0,0,0,0,0,0,0];
    const for_stats = {
        for_over4_5: realForData[1],
        for_over2_5: realForData[2],
        for_over3_5: realForData[3],
        for_over5_5: realForData[4],
        for_over6_5: realForData[5],
        for_over7_5: realForData[6],
        for_over8_5: realForData[7],
    };
    const for_average = realForData[8];

    const realAgainstData = cornersAgainstData[team.name] || [0,0,0,0,0,0,0,0,0];
    const against_stats = {
        against_over4_5: realAgainstData[1],
        against_over2_5: realAgainstData[2],
        against_over3_5: realAgainstData[3],
        against_over5_5: realAgainstData[4],
        against_over6_5: realAgainstData[5],
        against_over7_5: realAgainstData[6],
        against_over8_5: realAgainstData[7],
    };
    const against_average = realAgainstData[8];

    const realTotalData = totalCornersData[team.name] || [0,0,0,0,0,0,0,0,0];
    const total_stats = {
        mp: realTotalData[0],
        total_over9_5: realTotalData[1],
        total_over7_5: realTotalData[2],
        total_over8_5: realTotalData[3],
        total_over10_5: realTotalData[4],
        total_over11_5: realTotalData[5],
        total_over12_5: realTotalData[6],
        total_over13_5: realTotalData[7],
    };
    const total_average = realTotalData[8];

    const realTotalHomeData = totalCornersHomeData[team.name] || [0,0,0,0,0,0,0,0,0];
    const total_home_stats = {
        mp_home: realTotalHomeData[0],
        total_home_over9_5: realTotalHomeData[1],
        total_home_over7_5: realTotalHomeData[2],
        total_home_over8_5: realTotalHomeData[3],
        total_home_over10_5: realTotalHomeData[4],
        total_home_over11_5: realTotalHomeData[5],
        total_home_over12_5: realTotalHomeData[6],
        total_home_over13_5: realTotalHomeData[7],
    };
    const total_home_average = realTotalHomeData[8];

    const realTotalAwayData = totalCornersAwayData[team.name] || [0,0,0,0,0,0,0,0,0];
    const total_away_stats = {
        mp_away: realTotalAwayData[0],
        total_away_over9_5: realTotalAwayData[1],
        total_away_over7_5: realTotalAwayData[2],
        total_away_over8_5: realTotalAwayData[3],
        total_away_over10_5: realTotalAwayData[4],
        total_away_over11_5: realTotalAwayData[5],
        total_away_over12_5: realTotalAwayData[6],
        total_away_over13_5: realTotalAwayData[7],
    };
    const total_away_average = realTotalAwayData[8];

    return { 
        ...team, 
        ...for_stats, 
        for_average,
        ...against_stats,
        against_average,
        avg_corners_for: parseFloat(((for_average / 10) + 2).toFixed(2)), // Example calculation for avg corners
        avg_corners_against: parseFloat(((against_average / 10) + 1).toFixed(2)), // Example calculation for avg corners
        ...total_stats,
        total_average,
        ...total_home_stats,
        total_home_average,
        ...total_away_stats,
        total_away_average,
    };
});


export default function CornerStatsPage() {
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const otherLeagues = ['La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];

  const [homeTeam, setHomeTeam] = useState<string>('');
  const [awayTeam, setAwayTeam] = useState<string>('');
  const [predictedCorners, setPredictedCorners] = useState<string | null>(null);

  const homeTeamLogo = premierLeagueTeams.find(t => t.name === homeTeam)?.logo || null;
  const awayTeamLogo = premierLeagueTeams.find(t => t.name === awayTeam)?.logo || null;

  useEffect(() => {
    if (homeTeam && awayTeam) {
      const home = premierLeagueTeams.find(t => t.name === homeTeam);
      const away = premierLeagueTeams.find(t => t.name === awayTeam);

      if (home && away) {
        // Improved Algorithm: Average of the home team's home average and the away team's away average.
        const homeMatchAvg = home.total_home_average;
        const awayMatchAvg = away.total_away_average;
        
        if (homeMatchAvg > 0 && awayMatchAvg > 0) {
            const prediction = (homeMatchAvg + awayMatchAvg) / 2;
            setPredictedCorners(prediction.toFixed(2).replace('.', ','));
        } else {
            setPredictedCorners(null); // Reset if data is missing
        }
      }
    } else {
      setPredictedCorners(null);
    }
  }, [homeTeam, awayTeam]);

  return (
    <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-blue-950 min-h-screen text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            {/* League Selection Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsLeagueOpen(!isLeagueOpen)}
                    className="w-52 text-left px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
                >
                    <span className="font-semibold truncate">Premier League</span>
                    <span className="text-xs">▾</span>
                </button>
                {isLeagueOpen && (
                    <div className="absolute left-0 mt-1 w-52 bg-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {otherLeagues.map((league) => (
                            <button
                                key={league}
                                onClick={() => setIsLeagueOpen(false)} // Just closes dropdown
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-600"
                            >
                                {league}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <div className="flex gap-4 justify-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">Premier League -</h1>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-green-400">Corners For (%)</h1>
        </div>
        
        <div className="overflow-x-auto relative shadow-lg shadow-blue-500/20 sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-100 uppercase bg-gray-800 sticky top-0">
              <tr>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold">Team</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 4.5 For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">2.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">3.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">5.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">6.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">7.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">8.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Average</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {premierLeagueTeams
                  .sort((a, b) => cornersForOrder.indexOf(a.name) - cornersForOrder.indexOf(b.name))
                  .filter(team => team.for_average > 0)
                  .map((team) => (
                  <tr key={team.name} className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200">
                    <th scope="row" className="py-4 px-4 sm:px-6 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 relative">
                           <Image 
                               src={team.logo} 
                               alt={`${team.name} logo`} 
                               layout="fill" 
                               objectFit="contain"
                               onError={(e) => { e.currentTarget.src = defaultLogo; }}
                           />
                        </div>
                        <span>{team.name}</span>
                      </div>
                    </th>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over4_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over2_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over3_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over5_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over6_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over7_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.for_over8_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center font-bold text-cyan-300">{team.for_average}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Corners Against Table */}
        <div className="flex gap-4 justify-center mt-32 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">Premier League -</h1>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-red-400">Corners Against (%)</h1>
        </div>

        <div className="overflow-x-auto relative shadow-lg shadow-red-500/20 sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-100 uppercase bg-gray-800 sticky top-0">
              <tr>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold">Team</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 4.5 For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">2.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">3.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">5.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">6.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">7.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">8.5+ For</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Average</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {premierLeagueTeams
                  .sort((a, b) => cornersAgainstOrder.indexOf(a.name) - cornersAgainstOrder.indexOf(b.name))
                  .filter(team => team.against_average > 0)
                  .map((team) => (
                  <tr key={team.name} className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200">
                    <th scope="row" className="py-4 px-4 sm:px-6 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 relative">
                           <Image 
                               src={team.logo} 
                               alt={`${team.name} logo`} 
                               layout="fill" 
                               objectFit="contain"
                               onError={(e) => { e.currentTarget.src = defaultLogo; }}
                           />
                        </div>
                        <span>{team.name}</span>
                      </div>
                    </th>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over4_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over2_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over3_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over5_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over6_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over7_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.against_over8_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center font-bold text-cyan-300">{team.against_average}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* --- Total Corners Home --- */}
        <div className="flex gap-4 justify-center mt-32 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">Total Corners Home (%)</h1>
        </div>
        <div className="overflow-x-auto relative shadow-lg shadow-green-500/20 sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-100 uppercase bg-gray-800 sticky top-0">
              <tr>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold">Team</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">MP</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 9.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">7.5+ (Home)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">8.5+ (Home)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">10.5+ (Home)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">11.5+ (Home)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">12.5+ (Home)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">13.5+ (Home)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">AVG (Home)</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {premierLeagueTeams
                  .sort((a, b) => totalCornersHomeOrder.indexOf(a.name) - totalCornersHomeOrder.indexOf(b.name)) 
                  .filter(team => team.total_home_average > 0)
                  .map((team) => (
                  <tr key={team.name} className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200">
                    <th scope="row" className="py-4 px-4 sm:px-6 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 relative">
                           <Image 
                               src={team.logo} 
                               alt={`${team.name} logo`} 
                               layout="fill" 
                               objectFit="contain"
                               onError={(e) => { e.currentTarget.src = defaultLogo; }}
                           />
                        </div>
                        <span>{team.name}</span>
                      </div>
                    </th>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.mp_home}</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over9_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over7_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over8_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over10_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over11_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over12_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_home_over13_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center font-bold text-cyan-300">{team.total_home_average}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* --- Total Corners Away --- */}
        <div className="flex gap-4 justify-center mt-32 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">Total Corners Away (%)</h1>
        </div>
        <div className="overflow-x-auto relative shadow-lg shadow-yellow-500/20 sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-100 uppercase bg-gray-800 sticky top-0">
              <tr>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold">Team</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">MP</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 9.5 Away</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">7.5+ (Away)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">8.5+ (Away)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">10.5+ (Away)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">11.5+ (Away)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">12.5+ (Away)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">13.5+ (Away)</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">AVG (Away)</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {premierLeagueTeams
                  .sort((a, b) => totalCornersAwayOrder.indexOf(a.name) - totalCornersAwayOrder.indexOf(b.name))
                  .filter(team => team.total_away_average > 0)
                  .map((team) => (
                  <tr key={team.name} className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200">
                    <th scope="row" className="py-4 px-4 sm:px-6 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 relative">
                           <Image 
                               src={team.logo} 
                               alt={`${team.name} logo`} 
                               layout="fill" 
                               objectFit="contain"
                               onError={(e) => { e.currentTarget.src = defaultLogo; }}
                           />
                        </div>
                        <span>{team.name}</span>
                      </div>
                    </th>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.mp_away}</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over9_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over7_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over8_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over10_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over11_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over12_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_away_over13_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center font-bold text-cyan-300">{team.total_away_average}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* --- Total Corners (%) --- */}
        <div className="flex gap-4 justify-center mt-32 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">Total Corners (%)</h1>
        </div>
        <div className="overflow-x-auto relative shadow-lg shadow-purple-500/20 sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-100 uppercase bg-gray-800 sticky top-0">
              <tr>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold">Team</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">MP</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 9.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 7.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 8.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 10.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 11.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 12.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Over 13.5</th>
                <th scope="col" className="py-3 px-4 sm:px-6 font-semibold text-center">Average</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {premierLeagueTeams
                  .sort((a, b) => b.total_over9_5 - a.total_over9_5)
                  .filter(team => team.total_average > 0)
                  .map((team) => (
                  <tr key={team.name} className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200">
                    <th scope="row" className="py-4 px-4 sm:px-6 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 relative">
                           <Image 
                               src={team.logo} 
                               alt={`${team.name} logo`} 
                               layout="fill" 
                               objectFit="contain"
                               onError={(e) => { e.currentTarget.src = defaultLogo; }}
                           />
                        </div>
                        <span>{team.name}</span>
                      </div>
                    </th>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.mp}</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over9_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over7_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over8_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over10_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over11_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over12_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center">{team.total_over13_5}%</td>
                    <td className="py-4 px-4 sm:px-6 text-center font-bold text-cyan-300">{team.total_average}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Corner Generator */}
        <div className="mt-32 mb-16 pt-8 pb-12 bg-gray-900/50 backdrop-blur-sm border-2 border-green-500/30 rounded-2xl shadow-2xl shadow-green-500/20">
            <h2 className="text-3xl font-black text-center bg-gradient-to-r from-green-300 to-emerald-500 bg-clip-text text-transparent mb-10">
              Corner Prediction Generator
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 items-start justify-items-center gap-8 px-4">
              
              {/* Home Team Selection */}
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="w-28 h-28 bg-black/20 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center p-2">
                  {homeTeamLogo ? (
                    <Image src={homeTeamLogo} alt={`${homeTeam} logo`} width={80} height={80} objectFit="contain" />
                  ) : (
                    <span className="text-5xl text-gray-500">?</span>
                  )}
                </div>
                <select 
                  id="home-team"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="bg-gray-800/80 backdrop-blur border-2 border-green-500/30 rounded-xl px-4 py-3 w-full max-w-xs text-center focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-all duration-300 hover:border-green-400 appearance-none"
                >
                  <option value="">Select Home Team</option>
                  {premierLeagueTeams.sort((a,b) => a.name.localeCompare(b.name)).map(team => <option key={team.name} value={team.name}>{team.name}</option>)}
                </select>
              </div>

              {/* VS Separator */}
              <div className="text-6xl font-black text-green-400/70 self-center hidden md:block">
                VS
              </div>

              {/* Away Team Selection */}
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="w-28 h-28 bg-black/20 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center p-2">
                  {awayTeamLogo ? (
                    <Image src={awayTeamLogo} alt={`${awayTeam} logo`} width={80} height={80} objectFit="contain" />
                  ) : (
                    <span className="text-5xl text-gray-500">?</span>
                  )}
                </div>
                <select 
                  id="away-team"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="bg-gray-800/80 backdrop-blur border-2 border-green-500/30 rounded-xl px-4 py-3 w-full max-w-xs text-center focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-all duration-300 hover:border-green-400 appearance-none"
                >
                  <option value="">Select Away Team</option>
                  {premierLeagueTeams.sort((a,b) => a.name.localeCompare(b.name)).map(team => <option key={team.name} value={team.name}>{team.name}</option>)}
                </select>
              </div>
            </div>

            {predictedCorners && (
              <div className="mt-12 text-center">
                <p className="text-xl text-green-200/80 font-semibold mb-2">Predicted Total Corners</p>
                <p 
                  className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-300 to-emerald-500"
                  style={{ textShadow: '0 0 15px rgba(74, 222, 128, 0.5)' }}
                >
                  {predictedCorners}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

