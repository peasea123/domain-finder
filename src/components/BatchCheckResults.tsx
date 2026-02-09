import React from "react";

interface BatchCheckResult {
  total: number;
  available: number;
  taken: number;
  unknown: number;
  availablePercentage: number;
  takenPercentage: number;
  unknownPercentage: number;
  timeTaken: string;
  availableDomains: string[];
  fileLocation?: string;
}

const sampleResult: BatchCheckResult = {
  total: 11025,
  available: 1,
  taken: 11023,
  unknown: 1,
  availablePercentage: 0.01,
  takenPercentage: 99.98,
  unknownPercentage: 0.01,
  timeTaken: "72m 50s",
  availableDomains: ["nuzu.com"],
  fileLocation: "results/cvcv-batch-com-2026-02-08.json",
};

export function BatchCheckResults() {
  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📊 Batch Check Results</h2>
        <p className="text-sm text-gray-600 mt-1">
          Complete analysis of all {sampleResult.total.toLocaleString()} CVCV .com domain combinations
        </p>
      </div>

      {/* Big Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md">
          <div className="text-sm text-gray-600 mb-2">Total Checked</div>
          <div className="text-4xl font-bold text-gray-900">{sampleResult.total.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-2">domains in {sampleResult.timeTaken}</div>
        </div>

        <div className="bg-green-100 p-6 rounded-lg border-2 border-green-400 shadow-md">
          <div className="text-sm text-green-900 font-bold mb-2">💚 Available</div>
          <div className="text-4xl font-bold text-green-700">{sampleResult.available}</div>
          <div className="text-xs text-green-700 mt-2">{sampleResult.availablePercentage.toFixed(2)}%</div>
        </div>

        <div className="bg-red-100 p-6 rounded-lg border-2 border-red-400 shadow-md">
          <div className="text-sm text-red-900 font-bold mb-2">❌ Taken</div>
          <div className="text-4xl font-bold text-red-700">{sampleResult.taken.toLocaleString()}</div>
          <div className="text-xs text-red-700 mt-2">{sampleResult.takenPercentage.toFixed(2)}%</div>
        </div>

        <div className="bg-yellow-100 p-6 rounded-lg border-2 border-yellow-400 shadow-md">
          <div className="text-sm text-yellow-900 font-bold mb-2">❓ Unknown</div>
          <div className="text-4xl font-bold text-yellow-700">{sampleResult.unknown}</div>
          <div className="text-xs text-yellow-700 mt-2">{sampleResult.unknownPercentage.toFixed(2)}%</div>
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Analysis</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-gray-900">Finding Rate</p>
            <p className="text-gray-600">
              Out of {sampleResult.total.toLocaleString()} CVCV combinations, only <strong>{sampleResult.available} domain is available</strong> for registration. This represents a saturation rate of <strong>{(100 - sampleResult.availablePercentage).toFixed(2)}%</strong>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Market Saturation</p>
            <p className="text-gray-600">
              Short 4-letter domains are highly saturated. The probability of finding an available CVCV domain is extremely low (~0.01%), making them premium assets.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Available Domain</p>
            <p className="text-gray-600">
              <strong className="text-green-700">nuzu.com</strong> - A pronounceable 4-letter domain that slipped through the cracks
            </p>
          </div>
        </div>
      </div>

      {/* Available Domains List */}
      {sampleResult.availableDomains.length > 0 && (
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
          <h3 className="text-lg font-bold text-green-900 mb-4">🎉 Available Domains ({sampleResult.availableDomains.length})</h3>
          <div className="space-y-2">
            {sampleResult.availableDomains.map((domain) => (
              <div
                key={domain}
                className="bg-white p-4 rounded-lg border-l-4 border-green-500 flex items-center justify-between hover:bg-green-50 transition"
              >
                <div>
                  <p className="font-mono font-bold text-lg text-green-900">{domain}</p>
                  <p className="text-xs text-gray-500 mt-1">✅ Ready to register</p>
                </div>
                <div className="text-2xl">✨</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-300">
        <h3 className="text-lg font-bold text-blue-900 mb-4">💡 Recommendations</h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>
            <strong>Broaden Search:</strong> Try 5-letter patterns (CVCVC, CVCCV) for better availability
          </li>
          <li>
            <strong>Alternative TLDs:</strong> Check .io, .co, .net for more options (~5-10% availability)
          </li>
          <li>
            <strong>Add Constraints:</strong> Filter by vowel combinations or consonant patterns to narrow results
          </li>
          <li>
            <strong>Use UI Feature:</strong> The batch checker is perfect for exploration, but less practical for finding gems
          </li>
        </ul>
      </div>

      {/* Data Location */}
      <div className="bg-gray-100 p-4 rounded-lg border border-gray-400 font-mono text-xs text-gray-700">
        <p className="mb-2">📁 Full results saved to:</p>
        <p className="text-gray-600 break-all">{sampleResult.fileLocation}</p>
        <p className="text-gray-600 text-xs mt-2">File size: 2.12 MB (all results with details)</p>
      </div>
    </div>
  );
}
