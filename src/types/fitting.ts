import type { ANNOTATION_TOOLS, FITTING_ROUNDS, STANDARD_SHOT_TYPES } from "@/constants/fitting";

export type FittingRound = (typeof FITTING_ROUNDS)[number];
export type StandardShotType = (typeof STANDARD_SHOT_TYPES)[number];
export type FittingPhotoType = "detail" | StandardShotType;
export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number];

export interface AnnotationPoint {
  x: number;
  y: number;
}

export type AnnotationAction =
  | {
      id: string;
      tool: "pen";
      color: string;
      size: number;
      points: AnnotationPoint[];
    }
  | {
      id: string;
      tool: "arrow" | "circle";
      color: string;
      size: number;
      start: AnnotationPoint;
      end: AnnotationPoint;
    }
  | {
      id: string;
      tool: "text";
      color: string;
      size: number;
      position: AnnotationPoint;
      text: string;
    };

export interface FittingPhotoItem {
  id: string;
  sessionId: string;
  styleNo: string;
  fittingRound: FittingRound;
  sequence: number;
  photoType: FittingPhotoType;
  uri: string;
  originalUri: string;
  fileName: string;
  createdAt: number;
  annotationData: AnnotationAction[];
  isAnnotated: boolean;
}

export interface StandardShotStatus {
  front: boolean;
  side: boolean;
  back: boolean;
}

export interface FittingSession {
  sessionId: string;
  styleNo: string;
  fittingRound: FittingRound;
  startedAt: number;
  completedAt: number | null;
  photos: FittingPhotoItem[];
}
