"use client";

import React from "react";

interface SmartGeneratorSettingsProps {
  config: {
    targetLen: number;
    count: number;
    tlds: string[];
    style: "balanced" | "punchy" | "flowing" | "technical";
    seed?: number;
  };
  onChange: (config: SmartGeneratorSettingsProps["config"]) => void;
}

const STYLE_OPTIONS = [
  {
    value: "balanced" as const,
    label: "Balanced",
    desc: "Well-rounded, English-like names",
    emoji: "⚖️",
  },
  {
    value: "punchy" as const,
    label: "Punchy",
    desc: "Short, sharp, impactful",
    emoji: "💥",
  },
  {
    value: "flowing" as const,
    label: "Flowing",
    desc: "Smooth, melodic, elegant",
    emoji: "🌊",
  },
  {
    value: "technical" as const,
    label: "Technical",
    desc: "Modern, tech-forward",
    emoji: "⚡",
  },
];

export function SmartGeneratorSettings({
  config,
  onChange,
}: SmartGeneratorSettingsProps) {
  const update = (partial: Partial<SmartGeneratorSettingsProps["config"]>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-purple-200">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🧠</span>
        <h3 className="text-lg font-bold text-gray-900">Smart Generator</h3>
      </div>

      <div className="space-y-5">
        {/* Name Length */}
        <div>
          <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Name Length</span>
            <span className="text-purple-600 font-bold">{config.targetLen} chars</span>
          </label>
          <input
            type="range"
            min="3"
            max="12"
            value={config.targetLen}
            onChange={(e) => update({ targetLen: parseInt(e.target.value) })}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>3 (premium)</span>
            <span>12 (descriptive)</span>
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Number of Names</span>
            <span className="text-purple-600 font-bold">{config.count}</span>
          </label>
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={config.count}
            onChange={(e) => update({ count: parseInt(e.target.value) })}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>10</span>
            <span>200</span>
          </div>
        </div>

        {/* Style Preset */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Naming Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ style: opt.value })}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  config.style === opt.value
                    ? "border-purple-500 bg-purple-50 shadow-sm"
                    : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {opt.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* TLDs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            TLDs
          </label>
          <input
            type="text"
            value={config.tlds.join(", ")}
            onChange={(e) =>
              update({
                tlds: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="com, io, co"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Seed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seed <span className="text-gray-400">(optional, for reproducibility)</span>
          </label>
          <input
            type="number"
            value={config.seed ?? ""}
            onChange={(e) =>
              update({
                seed: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="Leave blank for random"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}
