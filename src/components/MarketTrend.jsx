import { LineChart } from "lucide-react";

function MarketTrend() {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-[#081633]">
          Market Trend
        </h2>

        <span className="px-4 py-2 rounded-full bg-green-100 text-green-600 text-sm font-semibold">
          +2.4% Today
        </span>
      </div>

      <div
        className="h-[420px] rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
        <LineChart size={52} />

        <p className="mt-4 text-lg font-semibold">
          Live Market Chart
        </p>

        <p className="text-sm">
          TradingView widget will be added here
        </p>
      </div>
    </div>
  );
}

export default MarketTrend;