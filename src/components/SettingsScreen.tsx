import React, { useState } from "react";
import { User, Smile, Plus, Trash2, Check, Sparkles, Moon, Sun, ChevronDown } from "lucide-react";
import { UserProfile, Workspace } from "@/lib/supabase";
import { CozyIcon, CURATED_AVATARS } from "./ui/Icons";

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  workspaces: Workspace[];
  onAddWorkspace: (name: string, icon: string, type: "personal" | "collaborative", adminName?: string) => void;
  onDeleteWorkspace: (id: string) => void;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onUpdateProfile,
  workspaces,
  onAddWorkspace,
  onDeleteWorkspace,
  activeWorkspaceId,
  setActiveWorkspaceId,
}) => {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar_icon);
  const [statusMessage, setStatusMessage] = useState(profile.status_message || "Flowing deeply...");
  
  const [newWsName, setNewWsName] = useState("");
  const [newWsIcon, setNewWsIcon] = useState("Briefcase");
  const [newWsType, setNewWsType] = useState<"personal" | "collaborative">("personal");
  const [newWsAdminName, setNewWsAdminName] = useState(profile.display_name || "Admin");

  // Accordion states
  const [openPanels, setOpenPanels] = useState({
    profile: true,
    themes: false,
    display: false,
    reminders: false,
    workspaces: false,
  });

  const togglePanel = (panel: keyof typeof openPanels) => {
    setOpenPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Save profile modifications including theme and status
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    onUpdateProfile({
      display_name: displayName.trim(),
      avatar_icon: selectedAvatar,
      status_message: statusMessage.trim(),
    });
    alert("✨ Sanctuary profile card updated successfully! ✨");
  };

  // Trigger theme changes instantly
  const handleThemeChange = (theme: "light" | "dark" | "sunset") => {
    onUpdateProfile({ theme });
  };

  const handleAddWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onAddWorkspace(newWsName.trim(), newWsIcon, newWsType, newWsAdminName.trim());
    setNewWsName("");
    setNewWsIcon("Briefcase");
    setNewWsType("personal");
    setNewWsAdminName(profile.display_name || "Admin");
    alert("✨ New space created successfully! ✨");
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in duration-300">
      
      {/* Left 3 Columns: Profile & Theme settings */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Profile Sanctuary Card */}
        <div className="soft-card p-6 bg-white shadow-sm transition-all">
          <div 
            className={`cursor-pointer flex justify-between items-center group ${openPanels.profile ? "border-b border-slate-100 pb-4 mb-5" : ""}`}
            onClick={() => togglePanel('profile')}
          >
            <div>
              <h3 className="text-lg font-black text-slate-800 transition-colors group-hover:text-blue-600">Profile Sanctuary</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Customize your aura profile identity</p>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${openPanels.profile ? "rotate-180" : ""} group-hover:text-blue-500`} />
          </div>

          {openPanels.profile && (
            <form onSubmit={handleSaveProfile} className="space-y-5 animate-in slide-in-from-top-2 duration-200">
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Display Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-150 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-700"
                  required
                />
              </div>
            </div>


            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all"
            >
              Update Profile Identity
            </button>
          </form>
          )}
        </div>

        {/* Aura Theme Sanctuary Switcher */}
        <div className="soft-card p-6 bg-white shadow-sm transition-all">
          <div 
            className={`cursor-pointer flex justify-between items-center group ${openPanels.themes ? "border-b border-slate-100 pb-3 mb-4" : ""}`}
            onClick={() => togglePanel('themes')}
          >
            <div>
              <h3 className="text-base font-bold text-slate-800 transition-colors group-hover:text-blue-600">Sanctuary Themes</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Toggle overall user visual appearance</p>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${openPanels.themes ? "rotate-180" : ""} group-hover:text-blue-500`} />
          </div>

          {openPanels.themes && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
            {/* Light Theme Option */}
            <button
              onClick={() => handleThemeChange("light")}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                profile.theme === "light" || !profile.theme
                  ? "border-blue-500 bg-blue-50/20 text-blue-600 ring-2 ring-blue-500/5"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}
            >
              <Sun size={20} className={profile.theme === "light" || !profile.theme ? "text-blue-500 animate-spin-slow" : "text-slate-400"} />
              <div className="text-center">
                <span className="font-bold text-xs block">Light Sanctuary</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 block">Default Clean</span>
              </div>
            </button>

            {/* Dark Theme Option */}
            <button
              onClick={() => handleThemeChange("dark")}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                profile.theme === "dark"
                  ? "border-blue-500 bg-slate-900 text-white ring-2 ring-blue-500/5 shadow-inner"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}
            >
              <Moon size={20} className={profile.theme === "dark" ? "text-blue-400 fill-blue-400/20" : "text-slate-400"} />
              <div className="text-center">
                <span className="font-bold text-xs block">Midnight Sanctuary</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 block">Sleek Obsidian</span>
              </div>
            </button>

            {/* Sunset Warm Theme Option */}
            <button
              onClick={() => handleThemeChange("sunset")}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                profile.theme === "sunset"
                  ? "border-orange-500 bg-orange-50/30 text-orange-700 ring-2 ring-orange-500/5"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}
            >
              <Sparkles size={20} className={profile.theme === "sunset" ? "text-orange-500" : "text-slate-400"} />
              <div className="text-center">
                <span className="font-bold text-xs block">Sunset Sanctuary</span>
                <span className="text-[9px] text-orange-500/70 uppercase tracking-widest mt-0.5 block">Warm Peach</span>
              </div>
            </button>
            </div>
          )}
        </div>

        {/* UI Display Size Selector Card */}
        <div className="soft-card p-6 bg-white shadow-sm transition-all">
          <div 
            className={`cursor-pointer flex justify-between items-center group ${openPanels.display ? "border-b border-slate-100 pb-3 mb-4" : ""}`}
            onClick={() => togglePanel('display')}
          >
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 transition-colors group-hover:text-violet-600">
                <CozyIcon name="Maximize2" className="text-violet-500 group-hover:text-violet-600" size={18} />
                <span>Display Size</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Adjust how dense or spacious the interface feels</p>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${openPanels.display ? "rotate-180" : ""} group-hover:text-violet-500`} />
          </div>

          {openPanels.display && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-200">
            {/* Compact Option */}
            <button
              onClick={() => onUpdateProfile({ ui_size: "compact" })}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all ${
                profile.ui_size === "compact"
                  ? "border-violet-500 bg-violet-50/30 text-violet-700 ring-2 ring-violet-500/5"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile.ui_size === "compact" ? "bg-violet-100 text-violet-600" : "bg-slate-50 text-slate-400"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="12" height="3" rx="1" /><rect x="2" y="8" width="12" height="3" rx="1" /></svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-xs block">Compact</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 block">Dense & Tight</span>
              </div>
            </button>

            {/* Comfortable Option (Default) */}
            <button
              onClick={() => onUpdateProfile({ ui_size: "comfortable" })}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all ${
                !profile.ui_size || profile.ui_size === "comfortable"
                  ? "border-blue-500 bg-blue-50/20 text-blue-700 ring-2 ring-blue-500/5"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!profile.ui_size || profile.ui_size === "comfortable" ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="2" width="12" height="4" rx="1" /><rect x="2" y="9" width="12" height="4" rx="1" /></svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-xs block">Comfortable</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 block">Default Balance</span>
              </div>
            </button>

            {/* Large Option */}
            <button
              onClick={() => onUpdateProfile({ ui_size: "large" })}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all ${
                profile.ui_size === "large"
                  ? "border-emerald-500 bg-emerald-50/30 text-emerald-700 ring-2 ring-emerald-500/5"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile.ui_size === "large" ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="1" width="14" height="5" rx="1.5" /><rect x="1" y="9" width="14" height="5" rx="1.5" /></svg>
              </div>
              <div className="text-center">
                <span className="font-bold text-xs block">Large</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 block">Spacious View</span>
              </div>
            </button>
            </div>
          )}
        </div>

        {/* Sanctuary Reminders & Alerts Settings Panel */}
        <div className="soft-card p-6 bg-white shadow-sm transition-all">
          <div 
            className={`cursor-pointer flex justify-between items-center group ${openPanels.reminders ? "border-b border-slate-100 pb-3 mb-4" : ""}`}
            onClick={() => togglePanel('reminders')}
          >
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 transition-colors group-hover:text-blue-600">
                <CozyIcon name="Clock" className="text-blue-500 group-hover:text-blue-600" size={18} />
                <span>Sanctuary Reminders</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Configure upcoming task notification thresholds</p>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${openPanels.reminders ? "rotate-180" : ""} group-hover:text-blue-500`} />
          </div>

          {openPanels.reminders && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Toggle Enable Reminders */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div>
                <span className="font-bold text-xs text-slate-700 block">Enable Task Reminders</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Show visual reminder alerts on dashboard</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateProfile({ enable_reminders: !profile.enable_reminders })}
                className={`w-12 h-6 rounded-full p-1 transition-all ${
                  profile.enable_reminders ? "bg-blue-600 flex justify-end" : "bg-slate-200 flex justify-start"
                }`}
                title="Toggle reminders alerts"
              >
                <span className="w-4 h-4 bg-white rounded-full block shadow" />
              </button>
            </div>

            {/* Threshold dropdown */}
            {profile.enable_reminders && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-1">
                  How many hours before due date?
                </label>
                <select
                  value={profile.reminder_threshold ?? 24}
                  onChange={(e) => onUpdateProfile({ reminder_threshold: parseInt(e.target.value) })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-150 bg-white font-semibold text-slate-600 focus:outline-none"
                >
                  <option value="1">1 hour before due date</option>
                  <option value="3">3 hours before due date</option>
                  <option value="12">12 hours before due date</option>
                  <option value="24">24 hours (1 day) before due date</option>
                  <option value="48">48 hours (2 days) before due date</option>
                </select>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {/* Right 2 Columns: Workspaces Management */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Workspace Management List card */}
        <div className="soft-card p-6 bg-white shadow-sm flex flex-col h-full transition-all">
          <div>
            <div 
              className={`cursor-pointer flex justify-between items-center group ${openPanels.workspaces ? "border-b border-slate-100 pb-3 mb-4" : ""}`}
              onClick={() => togglePanel('workspaces')}
            >
              <div>
                <h3 className="text-base font-black text-slate-800 transition-colors group-hover:text-blue-600">Workspace Management</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Control active workspaces</p>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${openPanels.workspaces ? "rotate-180" : ""} group-hover:text-blue-500`} />
            </div>

            {openPanels.workspaces && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                {/* Add workspace form */}
                {!profile.joined_room_id && (
                  <form onSubmit={handleAddWorkspace} className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Add Space Sanctuary</h4>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={newWsType}
                        onChange={(e) => setNewWsType(e.target.value as "personal" | "collaborative")}
                        className="text-xs px-2 rounded-xl border border-slate-150 bg-white font-semibold text-slate-500"
                      >
                        <option value="personal">Personal</option>
                        <option value="collaborative">Team</option>
                      </select>
                      <input
                        type="text"
                        placeholder="New Space Name"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-150 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-semibold"
                        required
                      />
                      <select
                        value={newWsIcon}
                        onChange={(e) => setNewWsIcon(e.target.value)}
                        className="text-xs px-2 rounded-xl border border-slate-150 bg-white font-semibold text-slate-500"
                      >
                        {["Briefcase", "User", "Heart", "Sparkles", "Feather", "Coffee", "Palette", "Target", "Code"].map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm text-xs font-bold transition-all flex items-center justify-center shrink-0"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    {newWsType === "collaborative" && (
                      <div className="animate-in slide-in-from-top-2 duration-200 mt-2">
                        <input
                          type="text"
                          placeholder="Your Name (Admin)"
                          value={newWsAdminName}
                          onChange={(e) => setNewWsAdminName(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-150 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-semibold"
                          required
                        />
                        <p className="text-[9px] text-slate-400 mt-1 font-semibold px-1">
                          You will be added as the first member.
                        </p>
                      </div>
                    )}
                  </form>
                )}

                {/* List of Workspaces */}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className={`flex flex-col gap-2 p-3 border rounded-xl ${ws.id === activeWorkspaceId ? "bg-blue-50/20 border-blue-100" : "bg-slate-50/50 border-slate-100"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            <CozyIcon name={ws.icon} size={15} />
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-700 truncate block leading-tight">
                              {ws.name} {ws.type === "collaborative" && "🤝"}
                            </span>
                          </div>
                        </div>
                        {/* Delete button (only allow delete if more than 1 workspace exists) */}
                        {workspaces.length > 1 ? (
                          <button
                            onClick={() => onDeleteWorkspace(ws.id)}
                            className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors shrink-0"
                            title="Delete Space"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      
                      {/* Room ID and Invite for Collaborative Workspaces */}
                      {ws.type === "collaborative" && ws.room_id && ws.id === activeWorkspaceId && (
                        <div className="mt-1 flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                          <div>
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Room ID</span>
                            <span className="text-xs font-semibold text-slate-700">{ws.room_id}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`Join my workspace on TaskFlow! Room ID: ${ws.room_id}`);
                              alert("Share link copied to clipboard!");
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors"
                          >
                            Copy Invite
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
