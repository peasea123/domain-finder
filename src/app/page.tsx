"use client";

import React, { useState } from "react";
import { GeneratorSettings } from "@/components/GeneratorSettings";
import { CheckerSettings } from "@/components/CheckerSettings";
import { ResultsTabs } from "@/components/ResultsTabs";
import { BatchCheckAdvanced } from "@/components/BatchCheckAdvanced";
import { SmartGeneratorSettings } from "@/components/SmartGeneratorSettings";
import { SmartResults } from "@/components/SmartResults";
import { GenerateRequest, CheckerConfig } from "@/lib/schema";
import { CheckResult } from "@/lib/checker";

type ActiveTab = "quick" | "smart" | "batch";

interface SmartConfig {
  targetLen: number;
  count: number;
  tlds: string[];
  style: "balanced" | "punchy" | "flowing" | "technical";
  seed?: number;
}

// Smart result items are dynamically shaped from the API merge
interface SmartResultItem {
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("quick");

  // Quick Generate state
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

  // Smart Names state
  const [smartConfig, setSmartConfig] = useState<SmartConfig>({
    targetLen: 5,
    count: 50,
    tlds: ["com"],
    style: "balanced",
  });

  const [smartResults, setSmartResults] = useState<SmartResultItem[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);
  const [smartSummary, setSmartSummary] = useState<{
    total: number;
    available: number;
    taken: number;
    unknown: number;
  } | null>(null);
  const [smartTotalGenerated, setSmartTotalGenerated] = useState<number | undefined>();
  const [smartTotalTime, setSmartTotalTime] = useState<number | undefined>();

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

  const handleSmartRun = async () => {
    setSmartLoading(true);
    setSmartError(null);
    setSmartResults([]);
    setSmartSummary(null);
    setSmartTotalGenerated(undefined);
    setSmartTotalTime(undefined);

    try {
      const response = await fetch("/api/smart-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generateConfig: smartConfig,
          checkerConfig: checkerConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Smart run failed");
      }

      const data = await response.json();
      setSmartResults(data.results);
      setSmartSummary(data.summary);
      setSmartTotalGenerated(data.generation?.totalGenerated);
      setSmartTotalTime(data.totalTime_ms);
    } catch (err) {
      setSmartError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSmartLoading(false);
    }
  };

  const TABS: { key: ActiveTab; label: string; emoji: string; desc: string }[] = [
    { key: "quick", label: "Quick Generate", emoji: "⚡", desc: "Pattern-based generation" },
    { key: "smart", label: "Smart Names", emoji: "🧠", desc: "AI-scored brandable names" },
    { key: "batch", label: "Batch Check", emoji: "📦", desc: "Check domains in bulk" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex items-stretch">
          {/* Left side: branding + tabs */}
          <div className="flex flex-col justify-between py-3 min-w-0 flex-1">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                QIKAZ
                <span className="text-indigo-500 font-normal text-sm ml-2">qikaz.com</span>
              </h1>
              <p className="text-gray-500 text-xs">
                Domain name generator &amp; availability checker
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 mt-3">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all border border-b-0 ${
                    activeTab === tab.key
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 border-gray-200"
                      : "bg-gray-50 text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-1.5">{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side: large logo */}
          <div className="flex-shrink-0 flex items-center pl-6">
            <img
              src="/android-chrome-512x512.png"
              alt="QIKAZ"
              className="h-[72px] w-auto object-contain"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ==================== QUICK GENERATE TAB ==================== */}
        {activeTab === "quick" && (
          <>
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
          </>
        )}

        {/* ==================== SMART NAMES TAB ==================== */}
        {activeTab === "smart" && (
          <>
            {/* Settings Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <SmartGeneratorSettings config={smartConfig} onChange={setSmartConfig} />
              <CheckerSettings config={checkerConfig} onChange={setCheckerConfig} />
            </div>

            {/* Run Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleSmartRun}
                disabled={smartLoading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {smartLoading ? "Generating..." : "🧠 Generate Smart Names"}
              </button>
            </div>

            {/* Error Message */}
            {smartError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-800 text-sm">
                <strong>Error:</strong> {smartError}
              </div>
            )}

            {/* Smart Results */}
            <SmartResults
              results={smartResults}
              isLoading={smartLoading}
              summary={smartSummary ?? undefined}
              totalGenerated={smartTotalGenerated}
              totalTime_ms={smartTotalTime}
            />

            {/* Info Box */}
            {smartResults.length === 0 && !smartLoading && !smartError && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-4xl mb-3">🧠</div>
                <p className="text-gray-600 text-sm mb-2">
                  <strong>Smart Names</strong> generates pronounceable, brandable domain names
                  using weighted phonetic patterns and scores them across 7 VC naming dimensions.
                </p>
                <p className="text-gray-400 text-xs">
                  Choose a style preset, set your target length, and click Generate.
                </p>
              </div>
            )}
          </>
        )}

        {/* ==================== BATCH CHECK TAB ==================== */}
        {activeTab === "batch" && (
          <div className="mb-16">
            <BatchCheckAdvanced />
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
