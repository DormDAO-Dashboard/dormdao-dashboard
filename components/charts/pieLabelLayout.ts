export const RADIAN = Math.PI / 180;

export interface PieLabelPosition {
  key: string;
  edgeX: number;
  edgeY: number;
  labelX: number;
  labelY: number;
  anchor: "start" | "end";
}

// Rough max width (px) of a rendered label — two labels closer than this in
// x are treated as potentially colliding and must clear `minGap` in y too.
const X_COLLISION_THRESHOLD = 90;
const RELAXATION_PASSES = 12;

// Computes external pie-slice label positions that don't overlap. Slices are
// assumed to start at angle 0 and run clockwise in array order — recharts'
// default Pie layout (confirmed empirically: cumulative-percentage angle,
// x = cx + r*cos(-angle*RADIAN), y = cy + r*sin(-angle*RADIAN)).
//
// Label y is non-monotonic in angle (it peaks at the bottom of the circle
// and dips at the top), so a simple single-direction "sort and push" can
// leave two angularly-distant slices with near-identical y by coincidence —
// e.g. a slice just past the bottom peak landing at the same y as an
// unrelated slice higher up on the other side. Instead this does a small
// symmetric relaxation: any two labels within `X_COLLISION_THRESHOLD` of
// each other in x get pushed apart in y until every such pair clears
// `minGap`, checking all pairs (not just neighbors), so it's independent of
// which side of the pie a slice happens to fall on.
export function computePieLabelPositions(
  slices: { key: string; pct: number }[],
  cx: number,
  cy: number,
  outerRadius: number,
  labelOffset: number,
  minGap: number
): Map<string, PieLabelPosition> {
  const radius = outerRadius + labelOffset;
  let cum = 0;
  const points = slices.map((s) => {
    const start = cum;
    cum += (s.pct / 100) * 360;
    const mid = (start + cum) / 2;
    const x = cx + radius * Math.cos(-mid * RADIAN);
    return {
      key: s.key,
      edgeX: cx + outerRadius * Math.cos(-mid * RADIAN),
      edgeY: cy + outerRadius * Math.sin(-mid * RADIAN),
      x,
      y: cy + radius * Math.sin(-mid * RADIAN),
      anchor: (x >= cx ? "start" : "end") as "start" | "end",
    };
  });

  for (let pass = 0; pass < RELAXATION_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        if (Math.abs(a.x - b.x) > X_COLLISION_THRESHOLD) continue;
        const dy = b.y - a.y;
        if (Math.abs(dy) < minGap) {
          const push = (minGap - Math.abs(dy)) / 2 + 0.5;
          if (dy >= 0) { a.y -= push; b.y += push; } else { a.y += push; b.y -= push; }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  const result = new Map<string, PieLabelPosition>();
  for (const p of points) {
    result.set(p.key, { key: p.key, edgeX: p.edgeX, edgeY: p.edgeY, labelX: p.x, labelY: p.y, anchor: p.anchor });
  }
  return result;
}
