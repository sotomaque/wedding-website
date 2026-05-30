import type { DashboardConfig } from "@/lib/validations/wedding-content";

export function buildExclusionFilter(config: DashboardConfig) {
  const filter: Record<string, boolean> = {};
  if (config.excludeThreeAndUnder) filter.threeAndUnder = false;
  if (config.excludeUnder21) filter.under21 = false;
  if (config.excludePlusOnes) filter.isPlusOne = false;
  return filter;
}
