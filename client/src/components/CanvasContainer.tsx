/**
 * Design: Clean Construction App
 * Measures available space and passes exact pixel dimensions to DrawingCanvas.
 * Uses position:absolute fill pattern to reliably get parent dimensions.
 */
import { useEffect, useRef, useState } from "react";
import DrawingCanvas from "./DrawingCanvas";

export default function CanvasContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    // position:relative + inset-0 child ensures the canvas always fills
    // exactly the space allocated by the flex layout, no more, no less.
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <DrawingCanvas width={size.width} height={size.height} />
    </div>
  );
}
