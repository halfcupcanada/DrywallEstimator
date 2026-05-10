/**
 * ProjectsPanel — slide-in drawer listing saved projects.
 * Allows users to load, save, rename, and delete projects.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useDrawingStore } from "@/store/useDrawingStore";
import type { Wall, Opening } from "@/store/useDrawingStore";
import {
  FolderOpen,
  Save,
  Trash2,
  Plus,
  X,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export default function ProjectsPanel({ onClose }: Props) {
  const { walls, openings, pxPerFoot, setWalls, setOpenings, setPxPerFoot } = useDrawingStore();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: projectList, isLoading } = trpc.project.list.useQuery(undefined, {
    retry: false,
  });

  const saveMutation = trpc.project.save.useMutation({
    onSuccess: (data) => {
      setCurrentProjectId(data.id);
      utils.project.list.invalidate();
      toast.success("Project saved");
      setSaveDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      toast.success("Project deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleLoad = async (id: number, name: string) => {
    // Fetch full project data
    try {
      const res = await utils.project.get.fetch({ id });
      if (!res) { toast.error("Project not found"); return; }
      const loadedWalls: Wall[] = JSON.parse(res.wallsJson);
      const loadedOpenings: Opening[] = JSON.parse(res.openingsJson);
      setWalls(loadedWalls);
      setOpenings(loadedOpenings);
      setPxPerFoot(res.pxPerFoot);
      setCurrentProjectId(id);
      setCurrentProjectName(name);
      toast.success(`Loaded "${name}"`);
      onClose();
    } catch {
      toast.error("Failed to load project");
    }
  };

  const handleSave = () => {
    if (!projectName.trim()) return;
    saveMutation.mutate({
      id: currentProjectId ?? undefined,
      name: projectName.trim(),
      wallsJson: JSON.stringify(walls),
      openingsJson: JSON.stringify(openings ?? []),
      pxPerFoot,
    });
  };

  const handleQuickSave = () => {
    if (!currentProjectId || !currentProjectName) {
      setSaveDialogOpen(true);
      setProjectName(currentProjectName || "");
      return;
    }
    saveMutation.mutate({
      id: currentProjectId,
      name: currentProjectName,
      wallsJson: JSON.stringify(walls),
      openingsJson: JSON.stringify(openings ?? []),
      pxPerFoot,
    });
  };

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-80 bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-orange-500" />
            <span className="font-semibold text-slate-800 text-sm">Projects</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Current project banner */}
        {currentProjectName && (
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">Current project</p>
              <p className="text-sm font-semibold text-orange-800 truncate">{currentProjectName}</p>
            </div>
            <button
              onClick={handleQuickSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
            >
              {saveMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Save
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 py-3 border-b border-slate-100 flex gap-2 shrink-0">
          <button
            onClick={() => { setSaveDialogOpen(true); setProjectName(currentProjectName || ""); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
          >
            <Plus size={13} />
            Save as New
          </button>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : !projectList || projectList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-4">
              <FileText size={28} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">No saved projects</p>
              <p className="text-xs mt-1">Save your current drawing to access it later.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projectList.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                    p.id === currentProjectId ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {formatDate(p.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLoad(p.id, p.name)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"?`)) {
                        deleteMutation.mutate({ id: p.id });
                        if (p.id === currentProjectId) {
                          setCurrentProjectId(null);
                          setCurrentProjectName("");
                        }
                      }
                    }}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Save dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Save Project</h3>
              <button onClick={() => setSaveDialogOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. 123 Main St — Master Bedroom"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSaveDialogOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!projectName.trim() || saveMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
