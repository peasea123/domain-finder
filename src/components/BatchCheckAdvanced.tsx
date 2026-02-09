"use client";

import React, { useState, useEffect } from "react";
import { CheckResult } from "@/lib/checker";

interface BatchSession {
  pattern: string;
  length: number;
  tlds: string[];
  random: boolean;
  seed?: number;
  totalAvailable: number;
  totalChecked: number;
  offset: number;
  timeout_ms: number;
  enableRDAP: boolean;
  enableHTTP: boolean;
}

export function BatchCheckAdvanced() {
  const [isRunning, setIsRunning] = useState(false);
  const [pattern, setPattern] = useState<string>("CVCV");
  const [length, setLength] = useState(4);
  const [tlds, setTlds] = useState("com");
  const [timeout, setTimeout] = useState(5000);
  const [enableRDAP, setEnableRDAP] = useState(true);
  const [enableHTTP, setEnableHTTP] = useState(false);
  const [orderMode, setOrderMode] = useState<"alphabetical" | "random">("alphabetical");
  const [randomSeed, setRandomSeed] = useState<number | undefined>();

  const [session, setSession] = useState<BatchSession | null>(null);
  const [recentDomains, setRecentDomains] = useState<CheckResult[]>([]);
  const [availableDomains, setAvailableDomains] = useState<CheckResult[]>([]);
  const [attemptedDomains, setAttemptedDomains] = useState<CheckResult[]>([]);
  const [totalCheckedOverall, setTotalCheckedOverall] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [wasStopped, setWasStopped] = useState(false);

  // Initialize to blank on component mount
  useEffect(() => {
    setRecentDomains([]);
    setAvailableDomains([]);
    setAttemptedDomains([]);
    setTotalCheckedOverall(0);
    setSession(null);
    setBatchCount(0);
    setError(null);
    setWasStopped(false);
  }, []);

  const calculateTotal = () => {
    const vowels = 5;
    const consonants = 20;

    // Parse pattern for constraints
    let expandedPattern = "";
    while (expandedPattern.length < length) {
      expandedPattern += pattern;
    }
    expandedPattern = expandedPattern.slice(0, length);

    // Count C's and V's (ignoring quoted letters)
    let consonantCount = 0;
    let vowelCount = 0;
    let i = 0;
    while (i < expandedPattern.length) {
      if (expandedPattern[i] === '"' && i + 2 < expandedPattern.length) {
        i += 3; // Skip quoted letter
      } else if (expandedPattern[i] === "C") {
        consonantCount++;
        i += 1;
      } else if (expandedPattern[i] === "V") {
        vowelCount++;
        i += 1;
      } else {
        i += 1; // Skip other chars
      }
    }

    const total = Math.pow(consonants, consonantCount) * Math.pow(vowels, vowelCount);
    const tldCount = tlds.split(",").filter((t) => t.trim()).length;
    return Math.floor(total * tldCount);
  };

  const estimatedBatchTime = () => {
    // 1000 domains at 40 req/sec = 25 seconds + overhead
    return 1;
  };

  const estimateTotalTime = () => {
    const total = calculateTotal();
    const batches = Math.ceil(total / 1000);
    const timePerBatch = estimatedBatchTime() + 0.5; // 0.5min overhead
    return Math.ceil(batches * timePerBatch);
  };

  const handleStartBatch = async () => {
    setIsRunning(true);
    setError(null);
    setStartTime(Date.now());
    setWasStopped(false);

    const controller = new AbortController();
    setAbortController(controller);

    // Reset attempted domains for first batch, keep for subsequent batches
    if (!session) {
      setAttemptedDomains([]);
    }

    const newSession: BatchSession = {
      pattern,
      length,
      tlds: tlds.split(",").map((t) => t.trim()).filter(Boolean),
      random: orderMode === "random",
      seed: orderMode === "random" ? randomSeed : undefined,
      totalAvailable: 0,
      totalChecked: 0,
      offset: session?.offset ? session.offset + 1000 : 0,
      timeout_ms: timeout,
      enableRDAP,
      enableHTTP,
    };

    setSession(newSession);
    setBatchCount((prev) => prev + 1);

    // Build list of already-attempted domain names for deduplication
    const skippedDomains = attemptedDomains.map((d) => d.domain);

    try {
      const response = await fetch("/api/batch-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern,
          length,
          tlds: newSession.tlds,
          config: {
            timeout_ms: timeout,
            enableRDAP,
            enableHTTP,
          },
          options: {
            offset: newSession.offset,
            limit: 1000,
            random: newSession.random,
            seed: newSession.seed,
          },
          skippedDomains,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to start batch check");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const currentBatchAttempted: CheckResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const result = JSON.parse(line);
            
            // Skip completion/status messages
            if (result.status === "complete") {
              continue;
            }

            currentBatchAttempted.push(result);
            setTotalCheckedOverall((prev) => prev + 1);
            setRecentDomains((prev) => [result, ...prev.slice(0, 9)]);

            if (result.verdict === "AVAILABLE") {
              setAvailableDomains((prev) => [result, ...prev]);
              setSession((prev) =>
                prev ? { ...prev, totalAvailable: prev.totalAvailable + 1 } : null
              );
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      // After successful batch, add all attempted domains
      setAttemptedDomains((prev) => [...prev, ...currentBatchAttempted]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User stopped the batch - still add what was attempted so far
        setWasStopped(true);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setIsRunning(false);
      setAbortController(null);
    }
  };

  const handleStopBatch = () => {
    if (abortController) {
      abortController.abort();
      setWasStopped(true);
    }
  };

  const handleSaveResults = () => {
    // Export all attempted domains (not just available), so user has complete batch record
    const domainsToExport = attemptedDomains.length > 0 ? attemptedDomains : availableDomains;
    
    if (domainsToExport.length === 0) {
      setError("No domains to export");
      return;
    }

    const csvContent = [
      ["Domain", "Verdict", "IP", "RDAP Status", "DNS Found", "HTTP Resolved", "Timestamp"],
      ...domainsToExport.map((d) => [
        d.domain,
        d.verdict,
        d.ip || "N/A",
        d.rdapStatus || "N/A",
        d.dnsRecordFound ? "Yes" : "No",
        d.httpResolved ? "Yes" : "No",
        d.timestamp,
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${batchCount}-attempted-domains-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSession(null);
    setRecentDomains([]);
    setAvailableDomains([]);
    setAttemptedDomains([]);
    setTotalCheckedOverall(0);
    setStartTime(null);
    setBatchCount(0);
    setError(null);
    setWasStopped(false);
    setAbortController(null);
  };

  const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🚀 Advanced Batch Checker</h2>
        <p className="text-sm text-gray-600 mt-1">
          Intelligent pagination, custom patterns, and pagination to handle large domain sets
        </p>
      </div>

      {!isRunning && !session && (
        <div className="space-y-4">
          {/* Row 1: Pattern & Length */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pattern Type</label>
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="CVCV">CVCV (4-letter)</option>
                <option value="CVCC">CVCC (4-letter)</option>
                <option value="VCVC">VCVC (4-letter)</option>
                <option value="CVVC">CVVC (4-letter)</option>
                <option value="CCVC">CCVC (4-letter)</option>
                <option value="CVCVC">CVCVC (5-letter)</option>
                <option value="custom">Custom Pattern...</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">C=consonant, V=vowel</p>
            </div>

            {pattern === "custom" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Pattern</label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value.toUpperCase())}
                  placeholder="e.g., VVCVCVV or &quot;a&quot;CVC"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Use quotes for fixed letters: &quot;a&quot;CVC</p>
              </div>
            )}

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
              <label className="block text-sm font-medium text-gray-700 mb-2">TLDs</label>
              <input
                type="text"
                value={tlds}
                onChange={(e) => setTlds(e.target.value)}
                placeholder="com,io,net"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Row 2: Order Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Mode</label>
              <div className="flex gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={orderMode === "alphabetical"}
                    onChange={() => setOrderMode("alphabetical")}
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm">Alphabetical</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={orderMode === "random"}
                    onChange={() => setOrderMode("random")}
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm">Random</span>
                </label>
              </div>
            </div>

            {orderMode === "random" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Random Seed (Optional)</label>
                <input
                  type="number"
                  value={randomSeed || ""}
                  onChange={(e) => setRandomSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Leave empty for random"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {/* Row 3: Config & Summary */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={enableRDAP} onChange={(e) => setEnableRDAP(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Enable RDAP</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={enableHTTP} onChange={(e) => setEnableHTTP(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Enable HTTP</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeout</label>
                <input
                  type="number"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={timeout}
                  onChange={(e) => setTimeout(parseInt(e.target.value))}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="font-bold text-lg text-purple-600">{calculateTotal().toLocaleString()}</p>
                  <p className="text-gray-600">Total Domains</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-blue-600">{Math.ceil(calculateTotal() / 1000)}</p>
                  <p className="text-gray-600">Batches (1000 each)</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-green-600">~{estimateTotalTime()}m</p>
                  <p className="text-gray-600">Est. Total Time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartBatch}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-lg"
          >
            🚀 Start Batch Check (Batch 1/{Math.ceil(calculateTotal() / 1000)})
          </button>
        </div>
      )}

      {/* Running State */}
      {isRunning && session && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
              <div className="text-2xl font-bold text-purple-600">{batchCount}</div>
              <div className="text-xs text-gray-600">Batch #</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
              <div className="text-2xl font-bold text-blue-600">{totalCheckedOverall.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Total Checked</div>
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

          {/* Recently Checked */}
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
                <div className="text-gray-400 text-center py-12">Checking domains...</div>
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
                      className="text-sm font-mono p-2 bg-white rounded border-l-4 border-green-500 text-green-900 font-bold"
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
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-3 h-3 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>

          {/* Stop Button */}
          <button
            onClick={handleStopBatch}
            className="w-full px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-lg"
          >
            ⏹️ Stop Batch (Keep Results)
          </button>
        </div>
      )}

      {/* Batch Complete or Stopped - Show Options */}
      {!isRunning && session && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-lg border-2 text-center ${
              wasStopped
                ? "bg-yellow-50 border-yellow-300"
                : "bg-green-50 border-green-300"
            }`}
          >
            <p className={`text-lg font-bold ${wasStopped ? "text-yellow-900" : "text-green-900"}`}>
              {wasStopped ? "⏹️ Batch Stopped" : "✅ Batch Complete"}
            </p>
            <p
              className={`text-sm mt-2 ${
                wasStopped ? "text-yellow-800" : "text-green-800"
              }`}
            >
              <strong>Batch {batchCount}:</strong> Attempted {attemptedDomains.length.toLocaleString()} domains
              {availableDomains.length > 0 && ` • Found ${availableDomains.length} available`}
            </p>
            <p
              className={`text-xs mt-1 ${
                wasStopped ? "text-yellow-700" : "text-green-700"
              }`}
            >
              Total session: {totalCheckedOverall.toLocaleString()} attempted across {batchCount} batch(es)
            </p>
          </div>

          {/* Available Domains Summary (if any found) */}
          {availableDomains.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                Available Domains ({availableDomains.length})
              </p>
              <div className="bg-green-50 rounded-lg border-2 border-green-300 h-40 overflow-y-auto p-3">
                <div className="space-y-1">
                  {availableDomains.map((domain) => (
                    <div
                      key={domain.domain}
                      className="text-sm font-mono p-2 bg-white rounded border-l-4 border-green-500 text-green-900 font-bold"
                    >
                      ✅ {domain.domain}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Options */}
          {attemptedDomains.length > 0 && (
            <div>
              <button
                onClick={handleSaveResults}
                className="w-full px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition mb-2"
              >
                💾 Download Batch {batchCount} ({attemptedDomains.length} attempted domains)
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition"
            >
              🔄 Start Over
            </button>
            <button
              onClick={handleStartBatch}
              className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
            >
              ➡️ Continue Next 1000
            </button>
          </div>

          {/* Session Info */}
          <div className="bg-white p-4 rounded-lg border border-gray-300 text-xs text-gray-600 space-y-1">
            <p>
              <strong>Pattern:</strong> {session.pattern} @ {session.length} letters
            </p>
            <p>
              <strong>TLDs:</strong> {session.tlds.join(", ")}
            </p>
            <p>
              <strong>Order:</strong>{" "}
              {session.random
                ? `Random${session.seed ? ` (seed: ${session.seed})` : ""}`
                : "Alphabetical"}
            </p>
            <p>
              <strong>Next Offset:</strong> {session.offset + 1000} (for continue button)
            </p>
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
