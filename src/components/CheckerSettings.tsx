"use client";

import React from "react";
import { CheckerConfig } from "@/lib/schema";

interface CheckerSettingsProps {
  config: CheckerConfig | undefined;
  onChange: (config: CheckerConfig) => void;
}

export function CheckerSettings({ config, onChange }: CheckerSettingsProps) {
  const currentConfig: CheckerConfig = config || {
    timeout_ms: 5000,
    concurrency: 5,
    retries: 1,
    enableRDAP: true,
    enableHTTP: false,
  };

  const updateConfig = (updates: Partial<CheckerConfig>) => {
    onChange({ ...currentConfig, ...updates });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Checker Settings</h3>

      {/* TLDs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TLDs to Check (leave blank to auto-detect)
        </label>
        <input
          type="text"
          value={currentConfig.tlds?.join(", ") || ""}
          onChange={(e) =>
            updateConfig({
              tlds: e.target.value
                ? e.target.value.split(",").map((t) => t.trim())
                : undefined,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="com, io, net"
        />
        <div className="text-xs text-gray-500 mt-1">
          (Auto-detected from generated domains if left empty)
        </div>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timeout per Check: <span className="text-blue-600 font-bold">{currentConfig.timeout_ms}ms</span>
        </label>
        <input
          type="range"
          min="1000"
          max="30000"
          step="1000"
          value={currentConfig.timeout_ms}
          onChange={(e) => updateConfig({ timeout_ms: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500 mt-1">1-30 seconds</div>
      </div>

      {/* Concurrency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parallel Concurrency: <span className="text-blue-600 font-bold">{currentConfig.concurrency}</span>
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={currentConfig.concurrency}
          onChange={(e) => updateConfig({ concurrency: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500 mt-1">1-50 concurrent checks</div>
      </div>

      {/* Retries */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Retries on Failure: <span className="text-blue-600 font-bold">{currentConfig.retries}</span>
        </label>
        <input
          type="range"
          min="0"
          max="3"
          value={currentConfig.retries}
          onChange={(e) => updateConfig({ retries: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500 mt-1">0-3 times</div>
      </div>

      {/* RDAP */}
      <div className="border-t pt-4">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="enableRDAP"
            checked={currentConfig.enableRDAP}
            onChange={(e) => updateConfig({ enableRDAP: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="enableRDAP" className="ml-2 text-sm font-medium text-gray-700">
            Enable RDAP (Authoritative Registry Lookup)
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          For .com/.net, queries Verisign RDAP for definitive registration status.
          <br />
          Highly recommended for accuracy.
        </p>
      </div>

      {/* HTTP Check */}
      <div className="border-t pt-4">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="enableHTTP"
            checked={currentConfig.enableHTTP}
            onChange={(e) => updateConfig({ enableHTTP: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="enableHTTP" className="ml-2 text-sm font-medium text-gray-700">
            Enable HTTP Check (Supporting Evidence)
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Performs HEAD request to domain. Used as secondary check, not definitive.
          <br />
          Slower but can detect content-based indicators.
        </p>
      </div>

      {/* Stop After N Available */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stop After N Available Domains (optional)
        </label>
        <input
          type="number"
          min="0"
          value={currentConfig.stopAfterNAvailable || ""}
          onChange={(e) =>
            updateConfig({
              stopAfterNAvailable: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Leave blank to check all"
        />
        <div className="text-xs text-gray-500 mt-1">
          Set to stop early once enough available domains are found
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">How Checks Work</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>
            <strong>DNS:</strong> Cloudflare DoH API for instant A/AAAA record lookup
          </li>
          <li>
            <strong>RDAP (.com/.net):</strong> Verisign RDAP for authoritative registration
            data
          </li>
          <li>
            <strong>HTTP:</strong> HEAD request to detect live web presence (optional)
          </li>
        </ul>
      </div>
    </div>
  );
}
