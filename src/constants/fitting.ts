export const FITTING_ROUNDS = ["P1", "P2", "PWT", "ONSITE"] as const;

export const FITTING_ROUND_LABELS: Record<(typeof FITTING_ROUNDS)[number], string> = {
  P1: "P1",
  P2: "P2",
  PWT: "PWT",
  ONSITE: "Onsite",
};

export const STANDARD_SHOT_TYPES = ["front", "side", "back"] as const;

export const PHOTO_TYPE_LABELS = {
  detail: "细节图",
  front: "正面",
  side: "侧面",
  back: "背面",
} as const;

export const ANNOTATION_TOOLS = ["pen", "arrow", "circle", "text"] as const;
