import React, { useEffect, useRef, useState } from "react";

// pdfjs-dist setup for Vite
import * as pdfjsLib from "pdfjs-dist";
// Vite: import worker as URL
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;

interface PdfCanvasViewerProps {
  pdfUrl: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ pdfUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(null);
      if (!pdfUrl || !containerRef.current) return;
      containerRef.current.innerHTML = ""; // clear
      try {
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        // Render first page (certificates are single-page)
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas context not available");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        const renderContext = { canvasContext: context, viewport } as any;
        await page.render(renderContext).promise;
        if (!cancelled) {
          containerRef.current!.appendChild(canvas);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to render PDF");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  return (
    <div className="w-full h-full overflow-auto bg-background">
      {error ? (
        <div className="h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          <p>Preview blocked by browser. Use Download or Print.</p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full flex items-start justify-center p-4" />
      )}
    </div>
  );
};
