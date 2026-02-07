"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  signedAt: string | null;
  auditId: string | null;
  disabled?: boolean;
}

export function SignaturePad({ onSignatureChange, signedAt, auditId, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      e.preventDefault();
      setIsDrawing(true);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [disabled, getPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPoint(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    },
    [isDrawing, disabled, getPoint]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing && hasDrawn) {
      const dataUrl = canvasRef.current?.toDataURL("image/png") ?? null;
      onSignatureChange(dataUrl);
    }
    setIsDrawing(false);
  }, [isDrawing, hasDrawn, onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  }, [disabled, onSignatureChange]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-slate-200 bg-slate-50/50 p-2">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full max-w-full touch-none cursor-crosshair rounded border border-slate-200 bg-white"
          style={{ width: "100%", maxWidth: "400px", height: "160px" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          aria-label="Signature pad"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            Clear signature
          </button>
        </div>
      </div>
      {signedAt && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800">
          <strong>Audit trail:</strong> Signed at {new Date(signedAt).toLocaleString()}
          {auditId && (
            <span className="ml-2 text-emerald-700">(ID: {auditId})</span>
          )}
        </div>
      )}
    </div>
  );
}
