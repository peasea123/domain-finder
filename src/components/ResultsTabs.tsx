"use client";

import React, { useState } from "react";
import { CheckResult } from "@/lib/checker";
import { exportToCSV, exportToJSON, downloadFile } from "@/lib/export";

interface ResultsTabsProps {
  results: CheckResult[];
  isLoading?: boolean;
}

export function ResultsTabs({ results, isLoading = false }: ResultsTabsProps) {
  const [currentTab, setCurrentTab] = useState<"all" | "available" | "taken" | "unknown">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"domain" | "verdict" | "confidence">("domain");

  const available = results.filter((r) => r.verdict === "AVAILABLE");
  const taken = results.filter((r) => r.verdict === "TAKEN");
  const unknown = results.filter((r) => r.verdict === "UNKNOWN");

  const filteredResults = (() => {
    let filtered =
      currentTab === "all"
        ? results
        : currentTab === "available"
          ? available
          : currentTab === "taken"
            ? taken
            : unknown;

    if (searchTerm) {
      filtered = filtered.filter((r) =>
        r.domain.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "domain") {
        return a.domain.localeCompare(b.domain);
      }
      if (sortBy === "verdict") {
        return a.verdict.localeCompare(b.verdict);
      }
      return a.confidence.localeCompare(b.confidence);
    });

    return filtered;
  })();

  const handleExportCSV = () => {
    const csv = exportToCSV(filteredResults);
    downloadFile(csv, "domains.csv", "text/csv");
  };

  const handleExportJSON = () => {
    const json = exportToJSON(filteredResults);
    downloadFile(json, "domains.json", "application/json");
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "all" as const, label: `All (${results.length})` },
          { id: "available" as const, label: `Available (${available.length})` },
          { id: "taken" as const, label: `Taken (${taken.length})` },
          { id: "unknown" as const, label: `Unknown (${unknown.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              currentTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search domains..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="domain">Sort: Domain</option>
          <option value="verdict">Sort: Verdict</option>
          <option value="confidence">Sort: Confidence</option>
        </select>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition"
        >
          Export CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
        >
          Export JSON
        </button>
      </div>

      {/* Results Table */}
      <div className="border rounded-lg overflow-hidden">
        {filteredResults.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {isLoading ? "Loading results..." : "No results to display"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Domain
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Verdict
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Reason
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr
                  key={result.domain}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-mono text-blue-600">
                    {result.domain}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        result.verdict === "AVAILABLE"
                          ? "bg-green-100 text-green-800"
                          : result.verdict === "TAKEN"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {result.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold ${
                        result.confidence === "HIGH"
                          ? "text-green-700"
                          : result.confidence === "MEDIUM"
                            ? "text-yellow-700"
                            : "text-red-700"
                      }`}
                    >
                      {result.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div className="max-w-xs">
                      {result.reasons.map((reason, i) => (
                        <div key={i} className="truncate">
                          {reason}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                    {result.ip || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
