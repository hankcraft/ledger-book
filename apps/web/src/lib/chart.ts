import type { TimelinePoint } from "@ledger-book/contracts";

type TimelineValue = "benchmarkValue" | "marketValue";

interface ChartBounds {
  width: number;
  height: number;
}

export function createTimelinePath(
  points: readonly TimelinePoint[],
  value: TimelineValue,
  bounds: ChartBounds,
): string {
  if (points.length === 0) {
    return "";
  }

  const values = points.map((point) => point[value]);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const range = highest - lowest;
  const divisor = Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = (index / divisor) * bounds.width;
      const y =
        range === 0
          ? bounds.height / 2
          : bounds.height - ((point[value] - lowest) / range) * bounds.height;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}
