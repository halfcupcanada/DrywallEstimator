/**
 * useAutoSave — app-level debounced auto-save hook.
 * Reads currentProjectId/currentProjectName from the drawing store so it
 * keeps working even when ProjectsPanel is closed.
 * Call this once at the top of the app (e.g. inside Home.tsx).
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useDrawingStore } from "@/store/useDrawingStore";
import { useAuth } from "@/_core/hooks/useAuth";

const DEBOUNCE_MS = 2000;

export function useAutoSave() {
  const { isAuthenticated } = useAuth();
  const { walls, openings, pxPerFoot, currentProjectId, currentProjectName } = useDrawingStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  const saveMutation = trpc.project.save.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !currentProjectId || !currentProjectName) return;
    if (walls.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      saveMutation.mutate({
        id: currentProjectId,
        name: currentProjectName,
        wallsJson: JSON.stringify(walls),
        openingsJson: JSON.stringify(openings),
        pxPerFoot,
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walls, openings, pxPerFoot, currentProjectId, currentProjectName, isAuthenticated]);
}
