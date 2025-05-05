'use client'; // Add this directive for client-side interactivity

import Image from "next/image"; // Make sure Image is imported
import { useState, useEffect } from 'react'; // Import useState and useEffect

// --- Define Interfaces for API Data Structure ---
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
  away_logo: string; // Note: API seems to provide this but also nested logo? Using nested one.
  away_team: string;
  btts_odds: number | null;
  combined_odds: number | null;
  competitors: Competitors;
  home_logo: string; // Note: API seems to provide this but also nested logo? Using nested one.
  home_team: string;
  match_id: number;
  over_2_5_odds: number | null;
  start_time: string;
  teams: string; // Format: "Home Team vs Away Team"
  tournament: Tournament;
}

// Default logo if a team's logo is not found or API doesn't provide one
const defaultLogo = "/logos/default.png"; // Example path for a default crest

export default function Home() {
  // --- State Variables ---
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const [isMatchOpen, setIsMatchOpen] = useState(false);

  // Selected values now store string for league name and full Match object for match
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // --- Fetch Data Effect ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("https://markonka.betly.win/api/odds");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: { matches: Match[] } = await response.json(); // Assuming top-level structure has "matches" key

        if (data.matches && data.matches.length > 0) {
          setApiMatches(data.matches);
          // Set initial selection based on the first match
          const firstMatch = data.matches[0];
          setSelectedLeague(firstMatch.tournament.name);
          setSelectedMatch(firstMatch);
        } else {
          setApiMatches([]); // Handle case where API returns empty matches
          setError("No matches found.");
        }
      } catch (e: any) {
        console.error("Failed to fetch odds:", e);
        setError(`Failed to load match data: ${e.message}`);
        setApiMatches([]); // Clear matches on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // --- Derived Data ---
  const uniqueLeagues = Array.from(new Set(apiMatches.map(match => match.tournament.name)));
  const filteredMatches = selectedLeague
    ? apiMatches.filter(match => match.tournament.name === selectedLeague)
    : [];

  // --- Toggle Functions ---
  const toggleLeagueDropdown = () => setIsLeagueOpen(!isLeagueOpen);
  const toggleMatchDropdown = () => setIsMatchOpen(!isMatchOpen);

  // --- Selection Functions ---
  const selectLeague = (leagueName: string) => {
    setSelectedLeague(leagueName);
    // Find the first match in the newly selected league
    const firstMatchInLeague = apiMatches.find(match => match.tournament.name === leagueName) || null;
    setSelectedMatch(firstMatchInLeague);
    setIsLeagueOpen(false);
    setIsMatchOpen(false); // Close match dropdown too
  };

  const selectMatch = (match: Match) => {
    setSelectedMatch(match);
    setIsMatchOpen(false);
  };

  // --- Calculations (use selectedMatch data) ---
  const overOdds = selectedMatch?.over_2_5_odds ?? 0; // Default to 0 if no match or odds
  // Keep percentage static for now, or fetch/calculate if available
  const overPercentage = 0.51; // Example: 51% chance for Over
  const overValue = (overOdds * overPercentage).toFixed(2);

  // --- Render Logic ---
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading matches...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-red-500">Error: {error}</div>;
  }

  if (!selectedMatch) {
     return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">No match selected or available.</div>;
  }

  // Extract details from selectedMatch safely
  const team1Name = selectedMatch.competitors.home.name;
  const team2Name = selectedMatch.competitors.away.name;
  const team1Logo = selectedMatch.competitors.home.logo || defaultLogo;
  const team2Logo = selectedMatch.competitors.away.logo || defaultLogo;
  const currentLeagueName = selectedMatch.tournament.name;


  return (
    // Added flex flex-col to make the root a column flex container
    <div className="bg-gradient-to-br from-blue-900 via-black to-blue-700 min-h-screen flex flex-col">
      {/* Selection Bar - Moved to top, made full width */}
      {/* Removed max-w-md, mb-4. Added px-4, py-2 */}
      <div className="w-full p-3 bg-gray-900 flex justify-between items-center text-white space-x-2 border-b border-gray-700 px-4 py-2"> {/* Adjusted padding and added border-b */}
        {/* League Selection Dropdown */}
        <div className="relative flex-1 max-w-xs"> {/* Added max-w-xs to prevent excessive stretching */}
          <button
            onClick={toggleLeagueDropdown}
            className="w-full text-left px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
            disabled={uniqueLeagues.length === 0}
          >
            <span className="text-sm truncate">{selectedLeague ?? 'Select League'}</span> {/* Added truncate */}
            <span className="text-xs">▾</span>
          </button>
          {isLeagueOpen && (
            <div className="absolute left-0 mt-1 w-full bg-gray-700 rounded shadow-lg z-10 max-h-60 overflow-y-auto">
              {uniqueLeagues.map((league) => (
                <button
                  key={league}
                  onClick={() => selectLeague(league)}
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-600"
                >
                  {league}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Match Selection Dropdown */}
        <div className="relative flex-1 max-w-xs"> {/* Added max-w-xs */}
           <button
             onClick={toggleMatchDropdown}
             className="w-full text-left px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
             disabled={filteredMatches.length === 0}
           >
            <span className="text-sm truncate">{selectedMatch?.teams ?? 'Select Match'}</span>
            <span className="text-xs">▾</span>
          </button>
           {isMatchOpen && (
             <div className="absolute left-0 right-0 md:left-auto md:right-0 mt-1 w-full md:w-auto bg-gray-700 rounded shadow-lg z-10 max-h-60 overflow-y-auto"> {/* Adjusted positioning for responsiveness */}
               {filteredMatches.map((match) => (
                 <button
                   key={match.match_id}
                   onClick={() => selectMatch(match)}
                   className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-600 truncate"
                 >
                   {match.teams}
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Main Content Area - Added flex-grow and justify-center */}
      <div className="flex flex-col items-center justify-center flex-grow px-4 mt-4 pb-4"> {/* Added flex-grow, justify-center */}

        {/* Existing Match Container - Now centered below the top bar */}
        <div className="w-full max-w-md border-2 border-blue-500 bg-gray-900 p-4 text-white flex flex-col justify-between rounded-xl shadow-xl shadow-blue-500/30">
          {/* Match Header */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">{currentLeagueName}</span> {/* Use dynamic league name */}
             {/* TODO: Add LIVE status and time dynamically here using selectedMatch.start_time */}
          </div>

          {/* Teams and Score */}
          <div className="flex justify-between items-center mb-4 space-x-3">
            {/* Team 1 */}
            <div className="flex items-center space-x-2 flex-1 justify-start min-w-0">
               {/* Use dynamic logo source with fallback */}
               <Image src={team1Logo} alt={`${team1Name} Logo`} width={28} height={28} onError={(e) => (e.currentTarget.src = defaultLogo)} />
              <span className="text-lg font-semibold truncate">{team1Name}</span> {/* Use dynamic team name */}
            </div>

            {/* Separator */}
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold mx-2">vs</span>
            </div>

            {/* Team 2 */}
            <div className="flex items-center space-x-2 flex-1 justify-end min-w-0">
               {/* Use dynamic logo source with fallback */}
               <Image src={team2Logo} alt={`${team2Name} Logo`} width={28} height={28} onError={(e) => (e.currentTarget.src = defaultLogo)} />
               <span className="text-lg font-semibold truncate">{team2Name}</span> {/* Use dynamic team name */}
            </div>
          </div>

          {/* +2.5 Goals Market */}
          <div className="flex flex-col items-center border-t border-gray-600 pt-4 mt-4">
            <div className="text-base text-gray-200 mb-3 font-bold">Total Goals +2.5</div>

            {/* Container for the Over section */}
            <div className="flex justify-center w-full text-center">
              {/* Over Section */}
              <div className="flex-1 max-w-xs bg-gray-800 p-3 rounded-lg border border-gray-600 hover:border-blue-400 transition-colors cursor-pointer">
                {/* --- Updated Over Display --- */}
                <div className="text-xs text-gray-400 mb-1">Over ({ (overPercentage * 100).toFixed(2) }%)</div> {/* Percentage display (static for now) */}
                {/* --- Highlighted Value --- */}
                <div className="text-lg font-semibold text-yellow-300 mb-1">Value: {overValue}</div> {/* Calculated Value */}
                {/* --- Dynamic Odds --- */}
                <div className="font-extrabold text-xl text-green-400 mb-1">{overOdds > 0 ? overOdds.toFixed(2) : '-'}</div> {/* Display dynamic odds or '-' */}
                 {/* --- End Updated --- */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
