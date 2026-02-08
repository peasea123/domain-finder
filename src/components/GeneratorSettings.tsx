"use client";

import React from "react";
import { GenerateRequest } from "@/lib/schema";

interface GeneratorSettingsProps {
  config: GenerateRequest;
  onChange: (config: GenerateRequest) => void;
}

export function GeneratorSettings({ config, onChange }: GeneratorSettingsProps) {
  const updateConfig = (updates: Partial<GenerateRequest>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Generator Settings</h3>

      {/* Count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Names: <span className="text-blue-600 font-bold">{config.count}</span>
        </label>
        <input
          type="range"
          min="1"
          max="500"
          value={config.count}
          onChange={(e) => updateConfig({ count: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500 mt-1">1-500</div>
      </div>

      {/* Length */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name Length: <span className="text-blue-600 font-bold">{config.length}</span>
        </label>
        <input
          type="range"
          min="3"
          max="12"
          value={config.length}
          onChange={(e) => updateConfig({ length: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500 mt-1">3-12 characters</div>
      </div>

      {/* Pattern */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phonetic Pattern
          <span className="text-gray-500 text-xs ml-2">
            (C=Consonant, V=Vowel)
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {["CVCV", "CVCC", "VCVC", "CVCVC", "CVVC", "CCVC"].map((pattern) => (
            <button
              key={pattern}
              onClick={() => updateConfig({ pattern: pattern as any })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                config.pattern === pattern
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {pattern}
            </button>
          ))}
        </div>
      </div>

      {/* TLDs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TLDs (comma-separated)
        </label>
        <input
          type="text"
          value={config.tlds.join(", ")}
          onChange={(e) =>
            updateConfig({
              tlds: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t),
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="com, io, co"
        />
      </div>

      {/* Prefix */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prefix (optional)
        </label>
        <input
          type="text"
          value={config.prefix || ""}
          onChange={(e) => updateConfig({ prefix: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 'br' for brand..."
        />
      </div>

      {/* Suffix */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Suffix (optional)
        </label>
        <input
          type="text"
          value={config.suffix || ""}
          onChange={(e) => updateConfig({ suffix: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 'ly' for adverbs..."
        />
      </div>

      {/* Excluded Letters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exclude Letters (optional)
        </label>
        <input
          type="text"
          value={config.excludeLetters?.join(", ") || ""}
          onChange={(e) =>
            updateConfig({
              excludeLetters: e.target.value
                ? e.target.value.split(",").map((l) => l.trim())
                : undefined,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., q, x, z"
        />
      </div>

      {/* Forbidden Bigrams */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Forbidden Bigrams (optional)
        </label>
        <input
          type="text"
          value={config.forbiddenBigrams?.join(", ") || ""}
          onChange={(e) =>
            updateConfig({
              forbiddenBigrams: e.target.value
                ? e.target.value.split(",").map((b) => b.trim())
                : undefined,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., ng, ck, th"
        />
      </div>

      {/* Allow Doubles */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="allowDoubles"
          checked={config.allowDoubles}
          onChange={(e) => updateConfig({ allowDoubles: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="allowDoubles" className="ml-2 text-sm text-gray-700">
          Allow double letters (e.g., &quot;ll&quot;, &quot;ss&quot;)
        </label>
      </div>

      {/* Seed */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seed (optional, for reproducibility)
        </label>
        <input
          type="number"
          value={config.seed || ""}
          onChange={(e) =>
            updateConfig({ seed: e.target.value ? parseInt(e.target.value) : undefined })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Leave blank for random"
        />
      </div>
    </div>
  );
}
