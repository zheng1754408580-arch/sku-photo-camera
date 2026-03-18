"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as CanvasPointerEvent } from "react";
import { ANNOTATION_TOOLS } from "@/constants/fitting";
import type {
  AnnotationAction,
  AnnotationPoint,
  AnnotationTool,
} from "@/types/fitting";

interface FittingAnnotationEditorProps {
  imageUri: string;
  initialActions?: AnnotationAction[];
  onClose: () => void;
  onDelete?: () => void;
  onSave: (uri: string, actions: AnnotationAction[]) => void;
}

const TOOL_LABELS: Record<AnnotationTool, string> = {
  pen: "Pen",
  arrow: "Arrow",
  circle: "Circle",
  text: "Text",
};

const DEFAULT_COLOR = "hsl(0 72% 55%)";
const DEFAULT_SIZE = 5;
const MAX_CANVAS_WIDTH = 900;

type DraftShape =
  | {
      tool: "pen";
      points: AnnotationPoint[];
    }
  | {
      tool: "arrow" | "circle";
      start: AnnotationPoint;
      end: AnnotationPoint;
    }
  | null;

function drawArrow(
  ctx: CanvasRenderingContext2D,
  start: AnnotationPoint,
  end: AnnotationPoint,
  color: string,
  size: number,
) {
  const headLength = Math.max(12, size * 3);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  start: AnnotationPoint,
  end: AnnotationPoint,
  color: string,
  size: number,
) {
  const x = (start.x + end.x) / 2;
  const y = (start.y + end.y) / 2;
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawActions(
  ctx: CanvasRenderingContext2D,
  actions: AnnotationAction[],
  scale = 1,
) {
  const textActions = actions.filter((action) => action.tool === "text");
  const shapeActions = actions.filter((action) => action.tool !== "text");

  for (const action of shapeActions) {
    ctx.save();
    if (action.tool === "pen") {
      if (action.points.length < 2) {
        ctx.restore();
        continue;
      }
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.size * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(action.points[0].x * scale, action.points[0].y * scale);
      action.points.slice(1).forEach((point) => {
        ctx.lineTo(point.x * scale, point.y * scale);
      });
      ctx.stroke();
    }

    if (action.tool === "arrow") {
      drawArrow(
        ctx,
        { x: action.start.x * scale, y: action.start.y * scale },
        { x: action.end.x * scale, y: action.end.y * scale },
        action.color,
        action.size * scale,
      );
    }

    if (action.tool === "circle") {
      drawCircle(
        ctx,
        { x: action.start.x * scale, y: action.start.y * scale },
        { x: action.end.x * scale, y: action.end.y * scale },
        action.color,
        action.size * scale,
      );
    }
    ctx.restore();
  }

  if (textActions.length === 0) return;

  const fontSize = Math.max(16, DEFAULT_SIZE * 4) * scale;
  const lineHeight = fontSize + 8 * scale;
  const startX = 16 * scale;
  const startY = 18 * scale;
  const boxPaddingX = 10 * scale;
  const boxPaddingY = 8 * scale;

  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  const maxTextWidth = Math.max(
    ...textActions.map((action) => ctx.measureText(action.text).width),
  );
  const boxWidth = maxTextWidth + boxPaddingX * 2;
  const boxHeight = textActions.length * lineHeight + boxPaddingY * 2 - 8 * scale;
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fillRect(startX - boxPaddingX, startY - boxPaddingY, boxWidth, boxHeight);
  ctx.restore();

  textActions.forEach((action, index) => {
    ctx.save();
    ctx.fillStyle = action.color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(action.text, startX, startY + index * lineHeight);
    ctx.restore();
  });
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function FittingAnnotationEditor({
  imageUri,
  initialActions = [],
  onClose,
  onDelete,
  onSave,
}: FittingAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [actions, setActions] = useState<AnnotationAction[]>(initialActions);
  const [draft, setDraft] = useState<DraftShape>(null);
  const [displaySize, setDisplaySize] = useState({ width: 320, height: 320 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });

  const scale = useMemo(
    () => displaySize.width / imageSize.width,
    [displaySize.width, imageSize.width],
  );

  useEffect(() => {
    setActions(initialActions);
  }, [initialActions]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const ratio = image.naturalHeight / image.naturalWidth;
      const maxWidth = Math.min(window.innerWidth - 40, MAX_CANVAS_WIDTH);
      const maxHeight = Math.max(220, window.innerHeight - 320);
      const width = Math.min(maxWidth, maxHeight / ratio);
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      setDisplaySize({ width, height: width * ratio });
    };
    image.src = imageUri;
  }, [imageUri]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displaySize.width * dpr;
    canvas.height = displaySize.height * dpr;
    canvas.style.width = `${displaySize.width}px`;
    canvas.style.height = `${displaySize.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displaySize.width, displaySize.height);
    ctx.drawImage(image, 0, 0, displaySize.width, displaySize.height);
    drawActions(ctx, actions, scale);

    if (draft?.tool === "pen") {
      drawActions(
        ctx,
        [
          {
            id: "draft",
            tool: "pen",
            color: DEFAULT_COLOR,
            size: DEFAULT_SIZE,
            points: draft.points,
          },
        ],
        scale,
      );
    }

    if (draft?.tool === "arrow" || draft?.tool === "circle") {
      drawActions(
        ctx,
        [
          {
            id: "draft",
            tool: draft.tool,
            color: DEFAULT_COLOR,
            size: DEFAULT_SIZE,
            start: draft.start,
            end: draft.end,
          },
        ],
        scale,
      );
    }
  }, [actions, draft, displaySize, scale]);

  const getPoint = (event: CanvasPointerEvent<HTMLCanvasElement>): AnnotationPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };

  const handlePointerDown = (event: CanvasPointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (tool === "text") {
      const text = window.prompt("Enter annotation text");
      if (!text?.trim()) return;
      setActions((prev) => [
        ...prev,
        {
          id: makeId(),
          tool: "text",
          color: DEFAULT_COLOR,
          size: DEFAULT_SIZE,
          position: point,
          text: text.trim(),
        },
      ]);
      return;
    }

    if (tool === "pen") {
      setDraft({ tool: "pen", points: [point] });
      return;
    }

    setDraft({ tool, start: point, end: point });
  };

  const handlePointerMove = (event: CanvasPointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const point = getPoint(event);

    if (draft.tool === "pen") {
      setDraft({ tool: "pen", points: [...draft.points, point] });
      return;
    }

    setDraft({ ...draft, end: point });
  };

  const handlePointerUp = () => {
    if (!draft) return;

    if (draft.tool === "pen") {
      if (draft.points.length > 1) {
        setActions((prev) => [
          ...prev,
          {
            id: makeId(),
            tool: "pen",
            color: DEFAULT_COLOR,
            size: DEFAULT_SIZE,
            points: draft.points,
          },
        ]);
      }
      setDraft(null);
      return;
    }

    setActions((prev) => [
      ...prev,
      {
        id: makeId(),
        tool: draft.tool,
        color: DEFAULT_COLOR,
        size: DEFAULT_SIZE,
        start: draft.start,
        end: draft.end,
      },
    ]);
    setDraft(null);
  };

  const handleUndo = () => {
    setDraft(null);
    setActions((prev) => prev.slice(0, -1));
  };

  const handleSave = () => {
    const image = imageRef.current;
    if (!image) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = image.naturalWidth;
    offscreen.height = image.naturalHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(image, 0, 0);
    drawActions(ctx, actions, 1);
    onSave(offscreen.toDataURL("image/jpeg", 0.9), actions);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--foreground))/0.12] p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-soft bg-[hsl(var(--surface-raised))/0.84] shadow-card backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-soft px-4 py-2.5">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Add Annotation</h3>
            <p className="text-xs leading-5 text-muted-foreground">Use pen, arrow, circle, or text. Saving will generate the annotated image.</p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-pill border border-[hsl(var(--destructive))/0.18] bg-[hsl(var(--destructive-soft))] px-4 py-2 text-sm font-medium text-destructive shadow-soft transition hover:brightness-[0.99]"
            >
              Delete Photo
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-soft px-4 py-2.5">
          {ANNOTATION_TOOLS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setDraft(null);
                setTool(item);
              }}
              className={`rounded-pill px-3 py-2 text-sm font-medium transition ${
                tool === item
                  ? "bg-destructive text-destructive-foreground shadow-soft"
                  : "border border-soft bg-surface-raised text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {TOOL_LABELS[item]}
            </button>
          ))}
          <button
            type="button"
            onClick={handleUndo}
            disabled={actions.length === 0}
            className="rounded-pill border border-soft bg-surface-raised px-3 py-2 text-sm font-medium text-muted-foreground shadow-soft transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            Undo
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[hsl(var(--surface-tint))/0.5] px-3 py-2.5">
          <canvas
            ref={canvasRef}
            className="mx-auto touch-none rounded-[1.35rem] bg-transparent shadow-soft"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-soft px-4 py-2.5">
          <p className="text-xs leading-5 text-muted-foreground">Tap the image with the text tool to add a note. Saving replaces the current annotated result.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-pill border border-soft bg-surface-raised px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-soft"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              Save Annotation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
