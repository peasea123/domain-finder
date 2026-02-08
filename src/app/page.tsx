"use client";

import React, { useState } from "react";
import { GeneratorSettings } from "@/components/GeneratorSettings";
import { CheckerSettings } from "@/components/CheckerSettings";
import { ResultsTabs } from "@/components/ResultsTabs";
import { GenerateRequest, CheckerConfig } from "@/lib/schema";
import { CheckResult } from "@/lib/checker";

export default function Home() {
  const [generatorConfig, setGeneratorConfig] = useState<GenerateRequest>({
    count: 50,
    length: 4,
    pattern: "CVCV",
    tlds: ["com"],
    allowDoubles: false,
    ensureUnique: true,
  });

  const [checkerConfig, setCheckerConfig] = useState<CheckerConfig>({
    timeout_ms: 5000,
    concurrency: 5,
    retries: 1,
    enableRDAP: true,
    enableHTTP: false,
  });

  const [results, setResults] = useState<CheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ available: number; taken: number; unknown: number } | null>(null);
  const [duration_ms, setDuration] = useState<number>(0);

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    setStats(null);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generateConfig: generatorConfig,
          checkerConfig: checkerConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run checker");
      }

      const data = await response.json();
      setResults(data.results);
      setStats(data.summary);
      setDuration(data.totalTime_ms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Domain Finder</h1>
          <p className="text-gray-600 text-sm mt-1">
            Smart domain name generator with real-time availability checking via DNS, RDAP, and
            HTTP
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Settings Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <GeneratorSettings config={generatorConfig} onChange={setGeneratorConfig} />
          <CheckerSettings config={checkerConfig} onChange={setCheckerConfig} />
        </div>

        {/* Run Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Running..." : "Generate + Check"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="text-gray-600 text-sm font-medium">Total</div>
              <div className="text-3xl font-bold text-gray-900">{results.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="text-green-600 text-sm font-medium">Available</div>
              <div className="text-3xl font-bold text-green-600">{stats.available}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="text-red-600 text-sm font-medium">Taken</div>
              <div className="text-3xl font-bold text-red-600">{stats.taken}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="text-yellow-600 text-sm font-medium">Unknown</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.unknown}</div>
            </div>
          </div>
        )}

        {/* Duration */}
        {duration_ms > 0 && (
          <div className="text-center text-gray-600 text-sm mb-8">
            Completed in <strong>{(duration_ms / 1000).toFixed(2)}s</strong>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <ResultsTabs results={results} isLoading={isLoading} />
          </div>
        )}

        {/* Info Box */}
        {results.length === 0 && !isLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 text-sm">
              Configure your settings above and click <strong>Generate + Check</strong> to find
              available domains
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>
            Domain Finder • All checks are performed against public DNS, RDAP, and HTTP APIs
            <br />
            <span className="text-gray-500">
              No secrets or personal data sent. Open source on GitHub.
            </span>
          </p>
        </div>
      </footer>
    </main>
  );
}
