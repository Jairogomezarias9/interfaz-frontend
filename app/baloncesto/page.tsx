'use client';

import React from 'react';

// --- Data Structure Interface ---
interface MatchProbabilities {
  name: string;
  q1: number; // Probability for Quarter 1
  q2: number; // Probability for Quarter 2
  q3: number; // Probability for Quarter 3
  q4: number; // Probability for Quarter 4
}

// --- Sample Data ---
const sampleMatches: MatchProbabilities[] = [
  { name: 'GER vs LVA', q1: 0.68, q2: 0.62, q3: 0.59, q4: 0.64 },
  { name: 'USA vs SRB', q1: 0.75, q2: 0.70, q3: 0.68, q4: 0.72 },
   { name: 'ITA vs CAN', q1: 0.40, q2: 0.45, q3: 0.42, q4: 0.38 }, //
  { name: 'ESP vs FRA', q1: 0.55, q2: 0.52, q3: 0.50, q4: 0.58 },
];

// --- Calculation Function ---
const calculateTotalProbability = (q1: number, q2: number, q3: number, q4: number): number => {
  const probabilityOfAllFailing = (1 - q1) * (1 - q2) * (1 - q3) * (1 - q4);
  const totalProbability = 1 - probabilityOfAllFailing;
  return totalProbability;
};

// --- Component to Display a Single Match ---
const MatchCard: React.FC<{ match: MatchProbabilities }> = ({ match }) => {
  const totalProb = calculateTotalProbability(match.q1, match.q2, match.q3, match.q4);
  const isRecommended = totalProb > 0.92;

  return (
    <div 
      className={`w-full max-w-md border-2 bg-gray-900 p-4 text-white flex flex-col justify-between rounded-xl shadow-xl ${
        isRecommended 
          ? 'border-orange-500 shadow-orange-500/30' 
          : 'border-gray-700 shadow-gray-500/20'
      }`}
    >
      {/* Match Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-white">{match.name}</h2>
        <div className="text-right">
          <span className={`text-2xl font-black ${isRecommended ? 'text-orange-400' : 'text-blue-300'}`}>
            {(totalProb * 100).toFixed(1)}%
          </span>
          <span className="text-gray-400 block text-xs">Total Probability</span>
        </div>
      </div>

      {/* Quarters Info */}
      <div className="grid grid-cols-4 gap-2 text-center border-t border-gray-600 pt-3">
        <div>
          <p className="text-xs text-gray-400">Q1</p>
          <p className="font-semibold">{Math.round(match.q1 * 100)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Q2</p>
          <p className="font-semibold">{Math.round(match.q2 * 100)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Q3</p>
          <p className="font-semibold">{Math.round(match.q3 * 100)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Q4</p>
          <p className="font-semibold">{Math.round(match.q4 * 100)}%</p>
        </div>
      </div>

      {isRecommended && (
        <div className="mt-3 text-xs font-semibold text-orange-400/90 border-t border-gray-600 pt-2 text-center">
          ✓ Suitable for Martingale System
        </div>
      )}
    </div>
  );
};


export default function BaloncestoPage() {
  return (
    <div className="flex flex-col items-center flex-grow px-4 pt-8 pb-8 overflow-y-auto space-y-4 bg-gradient-to-br from-orange-900 via-black to-orange-800 min-h-screen">
        <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-500">
                Basketball Martingale Analyzer
            </h1>
            
        </div>
        
        {sampleMatches.map(match => (
          <MatchCard key={match.name} match={match} />
        ))}
    </div>
  );
}
