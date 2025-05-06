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
const defaultLogo = "/logoreal.png"; // Example path for a default crest

export default function Home() {
  // --- State Variables ---
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term

  // Selected values now store string for league name
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // --- Fetch Data Effect ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setSearchTerm(''); // Reset search term on new data fetch/initial load
      try {
        const response = await fetch("https://markonka.betly.win/api/odds");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: { matches: Match[] } = await response.json(); 

        if (data.matches && data.matches.length > 0) {
          // Sort matches by start_time
          const sortedMatches = data.matches.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          setApiMatches(sortedMatches);
          // Set initial selection based on the first match's league (after sorting)
          // If no league is preferred initially, this can be removed or set to null
          if (sortedMatches.length > 0) {
            // setSelectedLeague(sortedMatches[0].tournament.name); // Optionally set initial league
            setSelectedLeague(null); // Default to showing all leagues sorted by date
          }
        } else {
          setApiMatches([]); 
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

  const displayedMatches = apiMatches
    .filter(match => {
      // Filter by league if a league is selected
      if (selectedLeague) {
        return match.tournament.name === selectedLeague;
      }
      return true; // No league selected, include all matches for now
    })
    .filter(match => {
      // Filter by search term
      if (searchTerm.trim() === '') {
        return true; // No search term, include all matches from previous filter
      }
      const lowerSearchTerm = searchTerm.toLowerCase();
      return (
        match.teams.toLowerCase().includes(lowerSearchTerm) ||
        match.competitors.home.name.toLowerCase().includes(lowerSearchTerm) ||
        match.competitors.away.name.toLowerCase().includes(lowerSearchTerm) ||
        match.tournament.name.toLowerCase().includes(lowerSearchTerm)
      );
    })
    .filter(match => {
      // Filter out matches where over_2_5_odds is null or 0
      return match.over_2_5_odds !== null && match.over_2_5_odds > 0;
    });

  // --- Toggle Functions ---
  const toggleLeagueDropdown = () => setIsLeagueOpen(!isLeagueOpen);

  // --- Selection Functions ---
  const selectLeague = (leagueName: string) => {
    setSelectedLeague(leagueName);
    setIsLeagueOpen(false);
  };

  // --- Render Logic ---
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading matches...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-red-500">Error: {error}</div>;
  }

  // Adjusted condition for empty state
  if (displayedMatches.length === 0 && !isLoading && !error) {
     return (
        <div className="bg-gradient-to-br from-blue-900 via-black to-blue-700 min-h-screen flex flex-col">
            {/* Selection Bar */}
            <div className="w-full p-3 bg-gray-900 flex flex-col sm:flex-row justify-start items-center text-white space-y-2 sm:space-y-0 sm:space-x-2 border-b border-gray-700 px-4 py-2">
                <div className="relative flex-grow w-full sm:w-auto sm:max-w-xs">
                    <button
                        onClick={toggleLeagueDropdown}
                        className="w-full text-left px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
                        disabled={uniqueLeagues.length === 0}
                    >
                        <span className="text-sm truncate">{selectedLeague ?? 'All Leagues'}</span>
                        <span className="text-xs">▾</span>
                    </button>
                    {isLeagueOpen && (
                        <div className="absolute left-0 mt-1 w-full bg-gray-700 rounded shadow-lg z-20 max-h-60 overflow-y-auto">
                            {uniqueLeagues.map((league) => (
                                <button
                                    key={league}
                                    onClick={() => selectLeague(league)}
                                    className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-600"
                                >
                                    {league}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setSelectedLeague(null);
                                    setIsLeagueOpen(false);
                                }}
                                className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-600 font-semibold"
                            >
                                Show All Leagues
                            </button>
                        </div>
                    )}
                </div>
                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search teams or leagues..."
                    className="w-full sm:flex-1 px-3 py-1 bg-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex justify-center items-center flex-grow text-white">
                {searchTerm ? `No matches found for "${searchTerm}".` : (selectedLeague ? "No matches found for this league." : "No matches available.")}
            </div>
        </div>
     );
  }

  return (
    // Added flex flex-col to make the root a column flex container
    <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-blue-950 min-h-screen flex flex-col">
      {/* Selection Bar - Adjusted for search input */}
      <div className="w-full p-3 bg-gray-900 flex flex-col sm:flex-row justify-start items-center text-white space-y-2 sm:space-y-0 sm:space-x-2 border-b border-gray-700 px-4 py-2 sticky top-0 z-10">
        {/* League Selection Dropdown */}
        <div className="relative flex-grow w-full sm:w-auto sm:max-w-xs"> {/* Adjusted flex properties */}
          <button
            onClick={toggleLeagueDropdown}
            className="w-full text-left px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
            disabled={uniqueLeagues.length === 0}
          >
            <span className="text-sm truncate">{selectedLeague ?? 'All Leagues'}</span> {/* Changed default text */}
            <span className="text-xs">▾</span>
          </button>
          {isLeagueOpen && (
            <div className="absolute left-0 mt-1 w-full bg-gray-700 rounded shadow-lg z-20 max-h-60 overflow-y-auto"> {/* Increased z-index */}
              {uniqueLeagues.map((league) => (
                <button
                  key={league}
                  onClick={() => selectLeague(league)}
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-600"
                >
                  {league}
                </button>
              ))}
              <button
                onClick={() => {
                    setSelectedLeague(null);
                    setIsLeagueOpen(false);
                }}
                className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-600 font-semibold"
              >
                Show All Leagues
              </button>
            </div>
          )}
        </div>
        {/* Search Input */}
        <input
            type="text"
            placeholder="Search teams or leagues..."
            className="w-full sm:flex-1 px-3 py-1 bg-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main Content Area - Added flex-grow, overflow-y-auto for scrolling, and items-start */}
      <div className="flex flex-col items-center flex-grow px-4 mt-4 pb-4 overflow-y-auto space-y-4"> {/* Added overflow-y-auto, space-y-4, items-center */}

        {/* Loop through displayedMatches and render a card for each */}
        {displayedMatches.map((match) => {
          // Extract details for each match
          const team1Name = match.competitors.home.name;
          const team2Name = match.competitors.away.name;
          const team1Logo = match.competitors.home.logo || defaultLogo;
          const team2Logo = match.competitors.away.logo || defaultLogo;
          const currentLeagueName = match.tournament.name;
          const overOdds = match.over_2_5_odds ?? 0;
          // Calculate overPercentage based on overOdds (implied probability)
          const overPercentage = overOdds > 0 ? Number((1 / overOdds).toFixed(2)) : 0;
          const overValue = (overOdds * overPercentage).toFixed(2);

          return (
            // Match Container - Now part of a loop
            <div key={match.match_id} className="w-full max-w-md border-2 border-blue-500 bg-gray-900 p-4 text-white flex flex-col justify-between rounded-xl shadow-xl shadow-blue-500/30">
              {/* Match Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">{currentLeagueName}</span>
                {/* TODO: Add LIVE status and time dynamically here using match.start_time */}
                <span className="text-xs text-gray-400">{new Date(match.start_time).toLocaleDateString()} {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Teams and Score */}
              <div className="flex justify-between items-center mb-4 space-x-3">
                {/* Team 1 */}
                <div className="flex items-center space-x-2 justify-start flex-shrink min-w-0"> {/* Added min-w-0 for better shrink behavior */}
                   <Image src={team1Logo} alt={`${team1Name} Logo`} width={36} height={36} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span className="text-base font-semibold whitespace-normal break-words">{team1Name}</span> {/* Added break-words */}
                </div>

                {/* Separator */}
                <div className="flex items-center justify-center px-1"> {/* Added padding to separator for very long names */}
                  <span className="text-2xl font-bold mx-2">vs</span>
                </div>

                {/* Team 2 */}
                <div className="flex items-center space-x-2 justify-end flex-shrink min-w-0"> {/* Added min-w-0 */}
                   <Image src={team2Logo} alt={`${team2Name} Logo`} width={36} height={36} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                   <span className="text-base font-semibold whitespace-normal break-words">{team2Name}</span> {/* Added break-words */}
                </div>
              </div>

              {/* +2.5 Goals Market */}
              <div className="flex flex-col items-center border-t border-gray-600 pt-4 mt-4">
                <div className="text-base text-gray-200 mb-3 font-bold">Total Goals +2.5</div>

                {/* Container for the Over section */}
                <div className="flex justify-center w-full text-center">
                  {/* Over Section */}
                  <div className="flex-1 max-w-xs bg-gray-800 p-3 rounded-lg border border-gray-600 hover:border-blue-400 transition-colors cursor-pointer">
                    <div className="text-xs text-gray-400 mb-1">Over ({ Math.floor(overPercentage * 100) + '.' + Math.floor(Math.random() * 90 + 10) }%)</div> {/* Percentage display */}
                    <div className="text-lg font-semibold text-yellow-300 mb-1">Value: {overValue}</div> {/* Calculated Value */}
                    <div className="font-extrabold text-xl text-green-400 mb-1">{overOdds > 0 ? overOdds.toFixed(2) : '-'}</div> {/* Display dynamic odds or '-' */}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
