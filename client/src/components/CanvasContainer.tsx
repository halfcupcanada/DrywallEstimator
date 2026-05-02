/**
 * Design: Clean Construction App
 * Measures available space and passes exact pixel dimensions to DrawingCanvas.
 */
import { useEffect, useRef, useState } from "react";
import DrawingCanvas from "./DrawingCanvas";

export default function CanvasContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative">
      <DrawingCanvas width={size.width} height={size.height} />
    </div>
  );
}
