import React, { useState } from "react";
import { ChevronDown, Plus, Sparkles, FolderKanban, Menu } from "lucide-react";
import { Workspace } from "@/lib/supabase";
import { CozyIcon } from "./ui/Icons";

interface HeaderProps {
  activeScreen: string;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  workspaces: Workspace[];
  onOpenAddTaskModal: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  activeWorkspaceId,
  setActiveWorkspaceId,
  workspaces,
  onOpenAddTaskModal,
  onToggleSidebar,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const screenTitles: Record<string, string> = {
    dashboard: "Personal Space",
    tasks: "My Tasks",
    kanban: "Mindful Flow",
    calendar: "Calendar",
    analytics: "Focus Insights",
    settings: "Settings",
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 gap-2">
      {/* Page Title / Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors lg:hidden shrink-0"
        >
          <Menu size={18} className="sm:w-[20px] sm:h-[20px]" />
        </button>
        <div className="min-w-0">
          <div className="text-xs sm:text-xs text-slate-500 font-medium mb-0.5 flex items-center gap-1.5 truncate">
            <span className="hidden sm:inline text-slate-400">TaskFlow</span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="truncate">Dashboard</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate min-w-0">
              {activeScreen === "dashboard" ? activeWorkspace?.name || "Personal Space" : screenTitles[activeScreen] || "TaskFlow Workspace"}
            </h2>
            {activeWorkspace?.type === "collaborative" ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:flex text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full items-center gap-0.5 border border-blue-100 animate-pulse">
                  👥 Collaborative
                </span>
                {activeWorkspace.room_id && (
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500">ID: {activeWorkspace.room_id}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Join my workspace on TaskFlow! Room ID: ${activeWorkspace.room_id}`);
                        alert("Share link copied to clipboard!");
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 px-2 py-0.5 rounded-md transition-colors shadow-sm"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            ) : (
              activeScreen === "dashboard" && (
                <span className="hidden sm:flex text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full items-center gap-0.5 shrink-0">
                  <Sparkles size={8} /> Active
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Top Bar Switcher dropdown and actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Workspace Switcher */}
        {activeScreen !== "dashboard" && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-700 font-semibold text-[10px] sm:text-xs transition-all duration-200"
            >
              <FolderKanban size={13} className="text-slate-400 hidden sm:block" />
              <span className="hidden sm:inline">Workspace:</span>
              <span className="max-w-[60px] sm:max-w-[100px] truncate">{activeWorkspace?.name || "Personal"}</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 sm:w-52 bg-white border border-slate-100 rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-slate-50">
                  Switch Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold transition-colors ${
                      ws.id === activeWorkspaceId
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CozyIcon name={ws.icon} size={14} className="shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global Create Button */}
        <button
          onClick={onOpenAddTaskModal}
          className="flex items-center gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl shadow-sm hover:shadow transition-all duration-200 shrink-0"
        >
          <Plus size={14} className="shrink-0" />
          <span className="whitespace-nowrap">New Task</span>
        </button>
      </div>
    </header>
  );
};

