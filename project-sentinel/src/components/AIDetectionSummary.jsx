import { Bot } from "lucide-react";

export default function AIDetectionSummary({ data }) {
  const { totalAnalyzed, aiGenerated, accuracyPct, breakdown } = data;

  return (
    <div className="ai-detection-summary rounded-2xl bg-purple-500 p-4 text-white shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">AI Detection Summary</h2>
        <Bot size={20} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="opacity-80">Total Content Analyzed</div>
          <div className="text-xl font-bold">{totalAnalyzed.toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-80">AI-Generated Content</div>
          <div className="text-xl font-bold">{aiGenerated.toLocaleString()}</div>
        </div>
        <div className="col-span-2">
          <div className="opacity-80">Detection Accuracy</div>
          <div className="text-xl font-bold">{accuracyPct}%</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {breakdown.map((b, i) => (
          <div key={i}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{b.label}</span>
              <span>{b.pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white" style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
