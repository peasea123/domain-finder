"use client";

import React, { useState } from "react";

interface SmartResult {
  name: string;
  domain: string;
  tld: string;
  score: number;
  scoreBreakdown: {
    overall: number;
    brevity: number;
    pronounceability: number;
    visualBalance: number;
    memorability: number;
    distinctiveness: number;
    trademarkSafety: number;
    domainPremium: number;
  };
  pattern: string;
  units: string[];
  verdict: string;
  confidence: string;
  checkDuration_ms?: number;
}

interface SmartResultsProps {
  results: SmartResult[];
  isLoading: boolean;
  summary?: {
    total: number;
    available: number;
    taken: number;
    unknown: number;
  };
  totalGenerated?: number;
  totalTime_ms?: number;
}

const DIMENSIONS = [
  { key: "brevity", label: "Brevity", emoji: "📏", desc: "Shorter = premium" },
  { key: "pronounceability", label: "Pronounce", emoji: "🗣️", desc: "Easy to say" },
  { key: "visualBalance", label: "Visual", emoji: "👁️", desc: "Looks balanced" },
  { key: "memorability", label: "Memory", emoji: "🧠", desc: "Easy to recall" },
  { key: "distinctiveness", label: "Distinct", emoji: "✨", desc: "Novel/unique" },
  { key: "trademarkSafety", label: "TM Safe", emoji: "🛡️", desc: "No brand conflicts" },
  { key: "domainPremium", label: "Premium", emoji: "💎", desc: "Domain value" },
] as const;

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-700 bg-green-100";
  if (score >= 65) return "text-blue-700 bg-blue-100";
  if (score >= 50) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

function scoreBadgeColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function verdictStyle(verdict: string): string {
  switch (verdict) {
    case "AVAILABLE":
      return "text-green-700 bg-green-100 border-green-300";
    case "TAKEN":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
  }
}

function verdictEmoji(verdict: string): string {
  switch (verdict) {
    case "AVAILABLE":
      return "✅";
    case "TAKEN":
      return "❌";
    default:
      return "❓";
  }
}

export function SmartResults({
  results,
  isLoading,
  summary,
  totalGenerated,
  totalTime_ms,
}: SmartResultsProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "name" | "verdict">("score");

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex gap-2 justify-center mb-4">
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-3 h-3 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
        <p className="text-gray-600 text-sm">Generating smart names, scoring, and checking availability...</p>
      </div>
    );
  }

  if (results.length === 0) return null;

  // Filter
  let filtered = results.filter((r) => r.score >= minScore);
  if (filterVerdict !== "all") {
    filtered = filtered.filter((r) => r.verdict === filterVerdict);
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "verdict") {
      const order = { AVAILABLE: 0, UNKNOWN: 1, TAKEN: 2 };
      return (order[a.verdict as keyof typeof order] ?? 1) - (order[b.verdict as keyof typeof order] ?? 1);
    }
    return 0;
  });

  const handleExportCSV = () => {
    const headers = [
      "Rank", "Domain", "Score", "Verdict",
      "Brevity", "Pronounceability", "Visual", "Memorability",
      "Distinctiveness", "TM Safety", "Premium",
      "Pattern", "Units",
    ];
    const rows = filtered.map((r, i) => [
      i + 1,
      r.domain,
      r.score,
      r.verdict,
      r.scoreBreakdown.brevity,
      r.scoreBreakdown.pronounceability,
      r.scoreBreakdown.visualBalance,
      r.scoreBreakdown.memorability,
      r.scoreBreakdown.distinctiveness,
      r.scoreBreakdown.trademarkSafety,
      r.scoreBreakdown.domainPremium,
      r.pattern,
      r.units.join("·"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-domains-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-xs text-gray-500">Results</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{summary.available}</div>
            <div className="text-xs text-green-700">Available</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200 shadow-sm text-center">
            <div className="text-2xl font-bold text-red-600">{summary.taken}</div>
            <div className="text-xs text-red-700">Taken</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 shadow-sm text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.unknown}</div>
            <div className="text-xs text-yellow-700">Unknown</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 shadow-sm text-center">
            <div className="text-2xl font-bold text-purple-600">{totalGenerated ?? "-"}</div>
            <div className="text-xs text-purple-700">Generated</div>
          </div>
        </div>
      )}

      {totalTime_ms !== undefined && totalTime_ms > 0 && (
        <div className="text-center text-gray-500 text-xs">
          Checked in <strong>{(totalTime_ms / 1000).toFixed(1)}s</strong>
        </div>
      )}

      {/* Filters & Controls */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Score filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Min Score:</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="w-24 accent-purple-600"
            />
            <span className="text-xs font-bold text-purple-600 w-6">{minScore}</span>
          </div>

          {/* Verdict filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Show:</label>
            <select
              value={filterVerdict}
              onChange={(e) => setFilterVerdict(e.target.value)}
              className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All</option>
              <option value="AVAILABLE">Available Only</option>
              <option value="TAKEN">Taken Only</option>
              <option value="UNKNOWN">Unknown Only</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score" | "name" | "verdict")}
              className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="score">Score (High→Low)</option>
              <option value="name">Name (A→Z)</option>
              <option value="verdict">Availability</option>
            </select>
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="ml-auto text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            📥 Export CSV
          </button>

          <span className="text-xs text-gray-400">
            {filtered.length} of {results.length} shown
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Domain</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">Score</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-24">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 w-28">Units</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((result, index) => (
                <React.Fragment key={result.domain}>
                  <tr
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                      result.verdict === "AVAILABLE" ? "bg-green-50/50" : ""
                    }`}
                    onClick={() =>
                      setExpandedRow(expandedRow === result.domain ? null : result.domain)
                    }
                  >
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{index + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-semibold text-gray-900">{result.domain}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor(
                          result.score
                        )}`}
                      >
                        {result.score}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${verdictStyle(
                          result.verdict
                        )}`}
                      >
                        {verdictEmoji(result.verdict)} {result.verdict}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-gray-500 font-mono">
                        {result.units.join("·")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-400">
                      {expandedRow === result.domain ? "▲" : "▼"}
                    </td>
                  </tr>

                  {/* Expanded Score Breakdown */}
                  {expandedRow === result.domain && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50 border-b">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Pattern: <strong className="text-gray-700">{result.pattern}</strong></span>
                            <span>•</span>
                            <span>Units: <strong className="font-mono text-gray-700">{result.units.join(" · ")}</strong></span>
                          </div>

                          {/* Score Bars */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {DIMENSIONS.map((dim) => {
                              const val =
                                result.scoreBreakdown[
                                  dim.key as keyof typeof result.scoreBreakdown
                                ];
                              return (
                                <div key={dim.key} className="flex items-center gap-2">
                                  <span className="text-sm w-5">{dim.emoji}</span>
                                  <span className="text-xs text-gray-600 w-20 truncate" title={dim.desc}>
                                    {dim.label}
                                  </span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${scoreBadgeColor(val)}`}
                                      style={{ width: `${val}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 w-6 text-right">
                                    {val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            No results match your filters. Try lowering the minimum score.
          </div>
        )}
      </div>

      {/* Score Legend */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 mb-2">Score Legend</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> 80+ Excellent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> 65–79 Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> 50–64 Fair
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &lt;50 Weak
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-500">
          {DIMENSIONS.map((dim) => (
            <span key={dim.key}>
              {dim.emoji} <strong>{dim.label}</strong>: {dim.desc}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
