import React from 'react';

interface Outcome {
    id: number;
    name?: string;
    odds: number;
    probabilities: number;
    marketId: number;
}

interface BTTSCardProps {
    outcomes: Outcome[];
    betDetails: {
        marketName: string;
        outcomeName: string;
        odds: string;
        probability: number;
        color: string;
    };
}

export default function BTTSCard({ outcomes, betDetails }: BTTSCardProps) {
    if (!outcomes || outcomes.length < 2) return null;

    // Identify Yes/No outcomes
    const yesOutcome = outcomes.find(o => o.name?.toLowerCase() === 'yes' || o.name?.toLowerCase() === 'sí') || outcomes[0];
    const noOutcome = outcomes.find(o => o.name?.toLowerCase() === 'no') || outcomes[1];

    const pYes = (yesOutcome?.probabilities || 0.5) * 100;
    const pNo = (noOutcome?.probabilities || 0.5) * 100;

    // Determine Dominant Outcome
    const isYesDominant = pYes >= pNo;
    const dominantColor = "#10b981"; // Emerald
    const dimColor = "#374151"; // Gray

    const pieGradient = isYesDominant
        ? `conic-gradient(${dominantColor} 0% ${pYes}%, ${dimColor} ${pYes}% 100%)`
        : `conic-gradient(${dimColor} 0% ${pYes}%, ${dominantColor} ${pYes}% 100%)`;

    // Calculate Value Edge
    const edge = (betDetails.probability * parseFloat(betDetails.odds) - 1) * 100;
    const isPositive = edge > 0;

    return (
        <div className="bg-[#050505] rounded-xl p-5 border border-white/5 w-full max-w-lg shadow-2xl relative overflow-hidden group">
            {/* Background Glow Effect - Tied to Dominant Side */}
            <div className={`absolute top-0 ${isYesDominant ? 'right-0' : 'left-0'} w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -z-10 transition-all duration-500`}></div>

            {/* Title */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">Ambos equipos anotarán</h3>
            </div>

            {/* Top Section: Chart & Stats */}
            <div className="flex flex-row items-center justify-between mb-8 px-2">

                {/* Left: Donut Chart */}
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                    {/* Ring Container */}
                    <div className="absolute inset-0 rounded-full p-2 bg-[#111] shadow-inner border border-white/5">
                        <div className="w-full h-full rounded-full transition-all duration-500" style={{ background: pieGradient }}></div>
                    </div>

                    {/* Inner Hole for Donut */}
                    <div className="absolute inset-4 bg-[#050505] rounded-full flex flex-col items-center justify-center border border-white/5 shadow-xl">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">
                            {isYesDominant ? 'Yes' : 'No'}
                        </span>
                        <span className={`text-3xl font-black ${isYesDominant ? 'text-emerald-400' : 'text-emerald-400'}`}>
                            {isYesDominant ? pYes.toFixed(1) : pNo.toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase mt-1">Probability</span>
                    </div>
                </div>

                {/* Right: Stats List */}
                <div className="flex flex-col justify-center gap-5 flex-1 pl-8">

                    {/* Option YES */}
                    <div className={`flex flex-col gap-1 transition-opacity duration-300 ${isYesDominant ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isYesDominant ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
                                <span className="text-xs font-bold text-gray-300 uppercase">Sí</span>
                            </div>
                            <span className={`text-xl font-black ${isYesDominant ? 'text-white' : 'text-gray-500'}`}>{pYes.toFixed(1)}%</span>
                        </div>
                        {isYesDominant && <div className="h-0.5 w-full bg-emerald-500/30 rounded-full mt-1"><div className="h-full bg-emerald-500 w-full rounded-full animate-pulse"></div></div>}
                    </div>

                    {/* Option NO */}
                    <div className={`flex flex-col gap-1 transition-opacity duration-300 ${!isYesDominant ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${!isYesDominant ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
                                <span className="text-xs font-bold text-gray-300 uppercase">No</span>
                            </div>
                            <span className={`text-xl font-black ${!isYesDominant ? 'text-white' : 'text-gray-500'}`}>{pNo.toFixed(1)}%</span>
                        </div>
                        {!isYesDominant && <div className="h-0.5 w-full bg-emerald-500/30 rounded-full mt-1"><div className="h-full bg-emerald-500 w-full rounded-full animate-pulse"></div></div>}
                    </div>

                </div>
            </div>

            {/* Bottom Row: Futuristic Call to Action */}
            <div className="mt-2 text-center">
                <div className="relative group cursor-pointer overflow-hidden rounded-xl">

                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 to-[#050505] opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>

                    {/* Border Line Top/Bottom */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>

                    <div className="relative flex items-center justify-between p-4 border border-emerald-500/20 rounded-xl bg-[#0a0a0a]/80 backdrop-blur-sm">

                        {/* Left: Signal Info */}
                        <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                                <span className="text-[9px] font-black tracking-[0.2em] text-emerald-400 uppercase">
                                    SMART SIGNAL
                                </span>
                            </div>
                            <div className="text-left leading-tight">
                                <span className="text-xs text-gray-400 font-medium block">Apuesta Sugerida:</span>
                                <span className="text-lg font-black text-white uppercase italic tracking-wide">
                                    {betDetails.outcomeName}
                                </span>
                            </div>
                        </div>

                        {/* Right: Odds Trigger */}
                        <div className="flex flex-col items-end">
                            <div className="bg-[#050505] px-4 py-1.5 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300">
                                <span className="text-2xl font-black text-white tracking-tight">{betDetails.odds}</span>
                            </div>
                            {isPositive && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded mt-1.5 font-bold border border-emerald-500/20">
                                    + {edge.toFixed(1)}% EDGE
                                </span>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
