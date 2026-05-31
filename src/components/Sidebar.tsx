import React, { useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  Calendar as CalendarIcon,
  BarChart2,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Plus,
  Sparkles,
} from "lucide-react";
import { CozyIcon } from "./ui/Icons";
import { Workspace, UserProfile } from "@/lib/supabase";
import { Modal } from "./ui/Modal";

interface SidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  workspaces: Workspace[];
  onAddWorkspace: (name: string, icon: string, type: "personal" | "collaborative", adminName?: string) => void;
  onJoinRoom: (roomId: string) => void;
  profile: UserProfile;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  setActiveScreen,
  activeWorkspaceId,
  setActiveWorkspaceId,
  workspaces,
  onAddWorkspace,
  onJoinRoom,
  profile,
  onLogout,
  isOpen,
  onClose,
}) => {
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isAddWsModalOpen, setIsAddWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsIcon, setNewWsIcon] = useState("Briefcase");
  const [newWsType, setNewWsType] = useState<"personal" | "collaborative">("personal");
  const [newWsAdminName, setNewWsAdminName] = useState(profile.display_name || "Admin");

  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onAddWorkspace(newWsName.trim(), newWsIcon, newWsType, newWsAdminName.trim());
    setNewWsName("");
    setNewWsType("personal");
    setNewWsAdminName(profile.display_name || "Admin");
    setIsAddWsModalOpen(false);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: activeWorkspace?.type === "collaborative" ? "Tasks" : "My Tasks", icon: CheckSquare },
    { id: "kanban", label: "Mindful Flow", icon: Kanban },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "analytics", label: "Focus Journey", icon: Sparkles },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ].filter((item) => {
    if (activeWorkspace?.type === "collaborative") {
      if (item.id === "calendar" || item.id === "analytics") {
        return false;
      }
    }
    return true;
  });

  return (
    <>
      {/* Mobile / Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"} lg:hidden`} 
        onClick={onClose}
      />

      <aside 
        className={`w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0 lg:shadow-none"}`}
      >
        {/* Brand Logo */}
        <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center shadow-md shadow-blue-500/10 text-white font-bold text-lg">
          T
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight tracking-tight">TaskFlow</h1>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Productivity Studio</span>
        </div>
      </div>

      {/* Workspace Switcher in Sidebar (Personal Space) */}
      <div className="px-4 py-2 relative">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 block mb-1">
          Space Selector
        </label>
        <button
          onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 bg-white transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CozyIcon name={activeWorkspace?.icon || "Briefcase"} size={16} />
            </div>
            <span className="font-semibold text-slate-700 text-sm truncate">
              {activeWorkspace?.name || "Personal Space"}
            </span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isWsDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {isWsDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="max-h-48 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    setIsWsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-sm font-medium transition-colors ${
                    ws.id === activeWorkspaceId
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CozyIcon name={ws.icon} size={15} />
                  <span className="truncate flex-1">{ws.name}</span>
                </button>
              ))}
            </div>
            {!profile?.joined_room_id && (
              <div className="border-t border-slate-50 mt-1 pt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setIsAddWsModalOpen(true);
                    setIsWsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Custom Space</span>
                </button>
                <button
                  onClick={() => {
                    setIsJoinRoomModalOpen(true);
                    setIsWsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                >
                  <Sparkles size={14} />
                  <span>Join Team Room</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 block mb-2">
          Navigation
        </label>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveScreen(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group text-left ${
                isActive
                  ? "bg-blue-50/70 text-blue-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors ${
                  isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Card at Bottom */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <CozyIcon name={profile?.avatar_icon || "User"} className="text-blue-600" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-700 truncate leading-tight">
              {profile?.display_name || "Demo"}
            </h4>
            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
              {profile?.email || "demo@gmail.com"}
            </span>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors duration-200 shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Add Workspace Modal */}
      <Modal isOpen={isAddWsModalOpen} onClose={() => setIsAddWsModalOpen(false)} title="Create New Space">
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Space Name</label>
            <input
              type="text"
              placeholder="e.g., Creative Lab, Fitness Zone"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-2">Space Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNewWsType("personal")}
                className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                  newWsType === "personal"
                    ? "border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-500"
                }`}
              >
                <div className="font-bold text-sm mb-0.5">Personal Space</div>
                <div className="text-[10px] opacity-80">Private focus & habits</div>
              </button>
              <button
                type="button"
                onClick={() => setNewWsType("collaborative")}
                className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                  newWsType === "collaborative"
                    ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-500"
                }`}
              >
                <div className="font-bold text-sm mb-0.5">Collaborative Room</div>
                <div className="text-[10px] opacity-80">Team tasks & assignments</div>
              </button>
            </div>
          </div>

          {newWsType === "collaborative" && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-bold text-slate-500 block mb-1">Your Name (Admin)</label>
              <input
                type="text"
                placeholder="E.g., Jane Doe"
                value={newWsAdminName}
                onChange={(e) => setNewWsAdminName(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                required
              />
              <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                You will be added as the first member and administrator of this team room.
              </p>
            </div>
          )}



          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsAddWsModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-colors"
            >
              Create Space
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal isOpen={isJoinRoomModalOpen} onClose={() => setIsJoinRoomModalOpen(false)} title="Join Collaborative Room">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!joinRoomId.trim()) return;
            onJoinRoom(joinRoomId.trim());
            setJoinRoomId("");
            setIsJoinRoomModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Room ID</label>
            <input
              type="text"
              placeholder="e.g., TF-ROOM-A1B2C3"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              required
            />
            <p className="text-[9px] text-slate-400 mt-2 font-semibold">
              Ask your team administrator for the unique Room ID. Once joined, your focus will be dedicated exclusively to this team&apos;s tasks!
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsJoinRoomModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/10 transition-colors"
            >
              Join Room
            </button>
          </div>
        </form>
      </Modal>
      </aside>
    </>
  );
};
