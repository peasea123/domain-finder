"use client";

import React, { useState } from "react";
import { CheckResult } from "@/lib/checker";

interface BatchCheckAllProps {
  onResultsUpdate?: (result: CheckResult) => void;
}

export function BatchCheckAll({ onResultsUpdate }: BatchCheckAllProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [pattern, setPattern] = useState<"CVCV" | "CVCC" | "VCVC" | "CVCVC" | "CVVC" | "CCVC">("CVCV");
  const [length, setLength] = useState(4);
  const [tlds, setTlds] = useState("com");
  const [timeout, setTimeout] = useState(5000);
  const [enableRDAP, setEnableRDAP] = useState(true);
  const [enableHTTP, setEnableHTTP] = useState(false);
  const [recentDomains, setRecentDomains] = useState<CheckResult[]>([]);
  const [availableDomains, setAvailableDomains] = useState<CheckResult[]>([]);
  const [totalChecked, setTotalChecked] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateTotal = () => {
    const vowels = 5; // a, e, i, o, u
    const consonants = 20; // all except 'y'

    // Expand pattern to match desired length
    let expandedPattern = "";
    while (expandedPattern.length < length) {
      expandedPattern += pattern;
    }
    expandedPattern = expandedPattern.slice(0, length);

    // Count consonants and vowels in expanded pattern
    const consonantCount = (expandedPattern.match(/C/g) || []).length;
    const vowelCount = (expandedPattern.match(/V/g) || []).length;

    // Calculate combinations for this length
    let total = Math.pow(consonants, consonantCount) * Math.pow(vowels, vowelCount);

    // Multiply by TLD count
    const tldCount = tlds.split(",").filter((t) => t.trim()).length;
    total *= tldCount;

    return Math.floor(total);
  };

  const estimatedTime = () => {
    const total = calculateTotal();
    // 40 req/sec, plus 1.5s batch delays for every 50 domains
    const requestTime = total / 40; // seconds
    const batchDelays = (Math.ceil(total / 50) - 1) * 1.5; // seconds
    const totalSeconds = requestTime + batchDelays;
    const minutes = Math.ceil(totalSeconds / 60);
    return minutes;
  };

  const handleStart = async () => {
    setIsRunning(true);
    setError(null);
    setRecentDomains([]);
    setAvailableDomains([]);
    setTotalChecked(0);
    setStartTime(Date.now());

    try {
      const response = await fetch("/api/batch-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern,
          length,
          tlds: tlds.split(",").map((t) => t.trim()).filter(Boolean),
          config: {
            timeout_ms: timeout,
            enableRDAP,
            enableHTTP,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start batch check");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const result = JSON.parse(line);
            setTotalChecked((prev) => prev + 1);
            setRecentDomains((prev) => [result, ...prev.slice(0, 9)]);

            if (result.verdict === "AVAILABLE") {
              setAvailableDomains((prev) => [result, ...prev]);
              onResultsUpdate?.(result);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🔥 Batch Check All</h2>
        <p className="text-sm text-gray-600 mt-1">
          Generate and check ALL combinations matching your criteria. Sit back, relax, and watch magic happen.
        </p>
      </div>

      {/* Warning Banner */}
      {!isRunning && (
        <div className="space-y-3">
          <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⏱️ Domains to Check:</strong> <strong>{calculateTotal().toLocaleString()}</strong> combinations
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Estimated time: <strong>{estimatedTime()} minute{estimatedTime() !== 1 ? 's' : ''}</strong> at 40 req/sec
            </p>
          </div>

          {calculateTotal() > 100000 && (
            <div className="p-4 bg-orange-50 border border-orange-400 rounded-lg">
              <p className="text-sm text-orange-900 font-semibold">⚠️ Exponential Growth Warning</p>
              <p className="text-sm text-orange-800 mt-2">
                You&apos;re requesting <strong>{calculateTotal().toLocaleString()}</strong> domains. This will take <strong>{estimatedTime()} minutes</strong>.
              </p>
              <p className="text-xs text-orange-700 mt-2">
                Pattern growth is exponential. Each additional letter roughly multiplies the time by 4-5x. Consider:
              </p>
              <ul className="text-xs text-orange-700 mt-1 list-disc list-inside space-y-1">
                <li>Starting with a shorter length (3-5 letters)</li>
                <li>Using the <strong>CLI script</strong> for large batches (no timeout)</li>
                <li>Running during off-hours to avoid rate limits</li>
              </ul>
            </div>
          )}

          {estimatedTime() > 5 && calculateTotal() <= 100000 && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>⚠️ Timeout Warning:</strong> Your estimated time ({estimatedTime()} min) exceeds the 5-minute browser timeout. Use the <strong>CLI</strong>:
              </p>
              <code className="block bg-red-100 p-2 rounded mt-2 text-xs font-mono text-red-900">
                node scripts/batch-check-cvcv-simple.js
              </code>
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      {!isRunning && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pattern</label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["CVCV", "CVCC", "VCVC", "CVCVC", "CVVC", "CCVC"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Length: {length}
            </label>
            <input
              type="range"
              min="3"
              max="12"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">TLDs (comma-separated)</label>
            <input
              type="text"
              value={tlds}
              onChange={(e) => setTlds(e.target.value)}
              placeholder="com,io,net"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout: {timeout}ms
            </label>
            <input
              type="range"
              min="1000"
              max="30000"
              step="1000"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableRDAP}
              onChange={(e) => setEnableRDAP(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Enable RDAP</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableHTTP}
              onChange={(e) => setEnableHTTP(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Enable HTTP</span>
          </label>
        </div>
      )}

      {/* Start Button */}
      {!isRunning && (
        <button
          onClick={handleStart}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition text-lg"
        >
          🚀 Start Batch Check ({calculateTotal().toLocaleString()} domains)
        </button>
      )}

      {/* Running State */}
      {isRunning && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
              <div className="text-2xl font-bold text-blue-600">{totalChecked.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Checked</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-green-300">
              <div className="text-2xl font-bold text-green-600">{availableDomains.length.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Available</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
              <div className="text-2xl font-bold text-purple-600">
                {minutes}m {seconds}s
              </div>
              <div className="text-xs text-gray-600">Elapsed</div>
            </div>
          </div>

          {/* Recently Checked (Scrolling) */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Recently Checked</p>
            <div className="bg-white rounded-lg border-2 border-gray-300 h-40 overflow-y-auto p-3 space-y-1">
              {recentDomains.length > 0 ? (
                recentDomains.map((domain) => (
                  <div
                    key={domain.domain}
                    className={`text-sm font-mono p-2 rounded transition ${
                      domain.verdict === "AVAILABLE"
                        ? "bg-green-100 text-green-900 font-bold animate-pulse"
                        : domain.verdict === "TAKEN"
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    <span className="mr-2">
                      {domain.verdict === "AVAILABLE" ? "✨" : domain.verdict === "TAKEN" ? "❌" : "❓"}
                    </span>
                    {domain.domain}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-center py-12">Waiting for results...</div>
              )}
            </div>
          </div>

          {/* Available Domains */}
          {availableDomains.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                Available Domains ({availableDomains.length})
              </p>
              <div className="bg-green-50 rounded-lg border-2 border-green-300 h-48 overflow-y-auto p-3">
                <div className="space-y-1">
                  {availableDomains.map((domain) => (
                    <div
                      key={domain.domain}
                      className="text-sm font-mono p-2 bg-white rounded border-l-4 border-green-500 text-green-900 font-bold hover:bg-green-50 transition"
                    >
                      ✅ {domain.domain}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          <div className="flex gap-1 justify-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-3 h-3 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}
    </div>
  );
}
