export const RADIAN = Math.PI / 180;

export interface PieLabelPosition {
  key: string;
  edgeX: number;
  edgeY: number;
  bendX: number;
  bendY: number;
  labelX: number;
  labelY: number;
  anchor: "start" | "end";
}

// How far past outerRadius the leader line's first "elbow" sits, before it
// bends toward the shared label column.
const ELBOW_OFFSET = 14;

interface RawPoint {
  key: string;
  edgeX: number;
  edgeY: number;
  bendX: number;
  bendY: number;
  naturalY: number;
  side: "left" | "right";
}

// Computes external pie-slice label positions in the standard two-column
// layout: every right-side label sits flush at one fixed x, every left-side
// label at another, each connected to its slice by a two-segment leader line
// (radial elbow, then a bend toward the column). This reads as organized —
// labels line up instead of fanning out at whatever x their angle happens to
// produce — and also sidesteps overlap entirely: each side is sorted by its
// natural (unadjusted) y top-to-bottom and then stacked with a minimum gap,
// so collisions can only happen within a side, never across the two columns.
//
// Slices are assumed to start at angle 0 and run clockwise in array order —
// recharts' default Pie layout (cumulative-percentage angle,
// x = cx + r*cos(-angle*RADIAN), y = cy + r*sin(-angle*RADIAN)).
export function computePieLabelPositions(
  slices: { key: string; pct: number }[],
  cx: number,
  cy: number,
  outerRadius: number,
  labelOffset: number,
  minGap: number
): Map<string, PieLabelPosition> {
  let cum = 0;
  const raw: RawPoint[] = slices.map((s) => {
    const start = cum;
    cum += (s.pct / 100) * 360;
    const mid = (start + cum) / 2;
    const cos = Math.cos(-mid * RADIAN);
    const sin = Math.sin(-mid * RADIAN);
    return {
      key: s.key,
      edgeX: cx + outerRadius * cos,
      edgeY: cy + outerRadius * sin,
      bendX: cx + (outerRadius + ELBOW_OFFSET) * cos,
      bendY: cy + (outerRadius + ELBOW_OFFSET) * sin,
      naturalY: cy + (outerRadius + labelOffset) * sin,
      side: cos >= 0 ? "right" : "left",
    };
  });

  const columnX = {
    right: cx + outerRadius + labelOffset,
    left: cx - (outerRadius + labelOffset),
  };

  function stack(side: "left" | "right"): PieLabelPosition[] {
    const items = raw.filter((p) => p.side === side).sort((a, b) => a.naturalY - b.naturalY);
    let prevY = -Infinity;
    return items.map((p) => {
      const y = Math.max(p.naturalY, prevY + minGap);
      prevY = y;
      return {
        key: p.key,
        edgeX: p.edgeX,
        edgeY: p.edgeY,
        bendX: p.bendX,
        bendY: p.bendY,
        labelX: columnX[side],
        labelY: y,
        anchor: side === "right" ? "start" as const : "end" as const,
      };
    });
  }

  const result = new Map<string, PieLabelPosition>();
  for (const p of [...stack("right"), ...stack("left")]) result.set(p.key, p);
  return result;
}
