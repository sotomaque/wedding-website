"use client";

import { Button } from "@workspace/ui/components/button";
import {
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface Insight {
  text: string;
  category: "urgency" | "trend" | "action" | "summary";
}

const categoryConfig = {
  urgency: {
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
  },
  trend: {
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
  },
  action: {
    icon: Lightbulb,
    color: "text-green-600 dark:text-green-400",
  },
  summary: {
    icon: BarChart3,
    color: "text-muted-foreground",
  },
};

export function RsvpInsightsCard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/ai/rsvp-insights/generate", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success && data.insights) {
        setInsights(data.insights);
      } else {
        setError(data.error ?? "Failed to generate insights");
      }
    } catch {
      setError("Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="p-6 bg-secondary rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">AI Insights</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {insights.length > 0 ? "Refresh" : "Generate"}
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {insights.length === 0 && !isGenerating && !error && (
        <p className="text-sm text-muted-foreground">
          Click Generate to analyze your RSVP data with AI.
        </p>
      )}

      {insights.length > 0 && (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const config = categoryConfig[insight.category];
            const Icon = config.icon;
            return (
              <li key={insight.text} className="flex items-start gap-2.5">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                <span className="text-sm">{insight.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
