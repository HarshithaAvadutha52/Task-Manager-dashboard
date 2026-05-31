"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DashboardScreen } from "@/components/DashboardScreen";
import { TasksScreen } from "@/components/TasksScreen";
import { KanbanScreen } from "@/components/KanbanScreen";
import { CalendarScreen } from "@/components/CalendarScreen";
import { AnalyticsScreen } from "@/components/AnalyticsScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { Modal } from "@/components/ui/Modal";
import { db, Task, Workspace, Habit, UserProfile, isSupabaseConfigured } from "@/lib/supabase";
import { Sparkles, Mail, Lock, Shield, Moon, Clock, Smile, Award, Bell, BellRing, Volume2, VolumeX, X, CheckCircle2 } from "lucide-react";

// --- Web Audio Chime Sound Generator ---
function playAlarmChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    // 3-tone pleasant chime: C5, E5, G5
    const now = ctx.currentTime;
    playTone(523, now, 0.3);
    playTone(659, now + 0.15, 0.3);
    playTone(784, now + 0.3, 0.5);
  } catch (e) {
    console.warn("Audio playback failed", e);
  }
}

export default function RootSanctuaryPage() {
  // --- Core State Coordinator ---
  const [activeScreen, setActiveScreen] = useState<string>("dashboard");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("all");
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streak, setStreak] = useState<number>(5);

  // UI Flow States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Auth Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Pre-selected parameters for Task Modal
  const [preselectedDate, setPreselectedDate] = useState<string>("");

  // Create Task Form States (in global Modal)
  const [addTaskTitle, setAddTaskTitle] = useState("");
  const [addTaskDesc, setAddTaskDesc] = useState("");
  const [addTaskPriority, setAddTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [addTaskDue, setAddTaskDue] = useState("");
  const [addTaskWorkspace, setAddTaskWorkspace] = useState("");

  const effectiveAddTaskWorkspace = workspaces.find(w => w.id === addTaskWorkspace)
    ? addTaskWorkspace
    : workspaces.find(w => w.id === activeWorkspaceId)
      ? activeWorkspaceId
      : (workspaces[0]?.id || "");
  const [addTaskReminder, setAddTaskReminder] = useState(false);

  // --- Alarm Reminder System State ---
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [alarmNotifications, setAlarmNotifications] = useState<{ taskId: string; title: string; dueDate: string }[]>([]);
  const firedRemindersRef = useRef<Set<string>>(new Set());

  // Check auth session on startup — fast path: load localStorage first, then hydrate
  useEffect(() => {
    // Fast synchronous check: if profile exists in localStorage, show UI immediately (Stale-while-revalidate)
    const localProfileStr = localStorage.getItem("tf_profile");
    if (localProfileStr) {
      try {
        const parsedProfile = JSON.parse(localProfileStr);
        setProfile(parsedProfile);
        setIsGuestMode(parsedProfile.id === "guest-user");
        
        // Load cached data instantly so the dashboard isn't empty
        const cachedTasks = localStorage.getItem("tf_tasks");
        const cachedWorkspaces = localStorage.getItem("tf_workspaces");
        const cachedHabits = localStorage.getItem("tf_habits");
        const cachedStreak = localStorage.getItem("tf_selfcare_streak");
        
        if (cachedTasks) setTasks(JSON.parse(cachedTasks));
        if (cachedWorkspaces) {
          const ws = JSON.parse(cachedWorkspaces);
          setWorkspaces(ws);
          if (ws.length > 0 && activeWorkspaceId === "all") {
             // Respect joined room if exists
             setActiveWorkspaceId(parsedProfile.joined_room_id || ws[0].id);
          }
        }
        if (cachedHabits) setHabits(JSON.parse(cachedHabits));
        if (cachedStreak) setStreak(parseInt(cachedStreak, 10));
        
        // Hide splash screen immediately!
        setIsLoading(false);
      } catch { /* ignore parse errors */ }
    }

    async function initSession() {
      try {
        const user = await db.getSessionUser();
        if (user) {
          setProfile(user);
          await loadSanctuaryData(); // Silent background refresh from Supabase
        } else if (localProfileStr) {
          await loadSanctuaryData();
        }
      } catch (err) {
        console.error("Session init failed", err);
      } finally {
        setIsLoading(false);
      }
    }

    // Safety timeout: never stay on loading screen longer than 3 seconds
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    initSession().finally(() => clearTimeout(safetyTimeout));
  }, []);

  // --- Temporary migration script to apply Demo Collab room and reset streak ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const runCleanup = localStorage.getItem('cleanup_v4');
      if (!runCleanup) {
        // Reset workspaces to include Personal and Demo Collab
        localStorage.setItem('tf_workspaces', JSON.stringify([
          { id: "personal", name: "Personal Space", icon: "User", type: "personal" },
          { id: "demo-collab", name: "Demo Collab Room", icon: "Users", type: "collaborative", room_id: "demo-room-123", admin_name: "Admin", members: ["Demo"] }
        ]));
        
        // Remove joined_room_id from profile so they aren't isolated
        const profStr = localStorage.getItem("tf_profile");
        if (profStr) {
           const p = JSON.parse(profStr);
           delete p.joined_room_id;
           localStorage.setItem("tf_profile", JSON.stringify(p));
        }

        // Reset the old dummy 5-day streak to 0
        localStorage.setItem("tf_selfcare_streak", "0");

        localStorage.setItem('cleanup_v4', 'done');
        window.location.reload();
      }
    }
  }, []);

  // --- Rotating Loading Messages ---
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // --- Alarm Reminder Engine (polls every 60s) ---
  useEffect(() => {
    if (!profile || !profile.enable_reminders) return;

    const checkReminders = () => {
      const threshold = profile.reminder_threshold ?? 24;
      const now = Date.now();
      const newAlarms: { taskId: string; title: string; dueDate: string }[] = [];

      tasks.forEach((task) => {
        if (!task.has_reminder) return;
        if (task.status === "completed") return;
        if (!task.due_date) return;
        if (firedRemindersRef.current.has(task.id)) return;

        try {
          const dueTime = new Date(`${task.due_date}T00:00:00`).getTime();
          const diffHours = (dueTime - now) / (3600 * 1000);
          // Fire if within threshold and not more than 24h past due
          if (diffHours <= threshold && diffHours >= -24) {
            firedRemindersRef.current.add(task.id);
            newAlarms.push({ taskId: task.id, title: task.title, dueDate: task.due_date });
          }
        } catch { /* skip malformed dates */ }
      });

      if (newAlarms.length > 0) {
        setAlarmNotifications((prev) => [...prev, ...newAlarms]);
        if (profile.sound_enabled) {
          playAlarmChime();
        }
      }
    };

    // Check immediately, then every 60 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 60000);
    return () => clearInterval(intervalId);
  }, [profile, tasks]);

  // Handle automatic redirect away from Analytics in Collaborative Workspaces
  useEffect(() => {
    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
    if (activeWorkspace?.type === "collaborative" && activeScreen === "analytics") {
      setActiveScreen("dashboard");
    }
  }, [activeWorkspaceId, activeScreen, workspaces]);

  // Fetch all user database records
  const loadSanctuaryData = async () => {
    try {
      const wsData = await db.getWorkspaces();
      const currentProfileStr = localStorage.getItem("tf_profile");
      const currentProfile = currentProfileStr ? JSON.parse(currentProfileStr) : null;
      
      let allowedWorkspaces = wsData;
      if (currentProfile?.joined_room_id) {
        const joined = wsData.find(w => w.id === currentProfile.joined_room_id);
        if (joined) allowedWorkspaces = [joined];
      } else {
        allowedWorkspaces = wsData.filter(ws => {
          if (ws.type !== "collaborative") return true;
          if (ws.admin_name === currentProfile?.display_name) return true;
          if (ws.members?.includes(currentProfile?.display_name || "")) return true;
          return false;
        });
      }
      setWorkspaces(allowedWorkspaces);
      if (currentProfile?.joined_room_id && allowedWorkspaces.length > 0) {
        setActiveWorkspaceId(allowedWorkspaces[0].id);
      }
      
      const taskData = await db.getAllTasks();
      setTasks(taskData);
      
      const habitData = await db.getHabits();
      setHabits(habitData);

      const streakCount = await db.getSelfCareStreak();
      setStreak(streakCount);

      // Pre-select first workspace for creations
      if (wsData.length > 0) {
        setAddTaskWorkspace(wsData[0].id);
      }
    } catch (err) {
      console.error("Data loading failed", err);
    }
  };

  // --- Auth Actions ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsLoading(true);

    try {
      if (isSignUpMode) {
        await db.signUp(email, password);
        setAuthSuccess("Registration successful! Please check your email inbox to verify your account before signing in.");
        setIsSignUpMode(false);
        setPassword(""); // Clear password so they can log in
      } else {
        const user = await db.signIn(email, password);
        setProfile(user);
        await loadSanctuaryData();
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestEnter = async () => {
    setIsLoading(true);
    try {
      // Setup Guest User Profile
      const guestProfile = await db.updateProfile({
        id: "guest-user",
        display_name: "Demo",
        avatar_icon: "Sparkles",
        email: "demo@gmail.com",
      });
      setProfile(guestProfile);
      setIsGuestMode(true);
      await loadSanctuaryData();
      // Show sound permission prompt if not yet set
      if (guestProfile.sound_enabled === undefined || guestProfile.sound_enabled === null) {
        setShowSoundPrompt(true);
      }
    } catch (err) {
      console.error("Guest mode load failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await db.signOut();
      setProfile(null);
      setIsGuestMode(false);
      localStorage.removeItem("tf_profile");
    } catch (err) {
      console.error("Signout failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Task Operations ---
  const handleCreateTask = async (
    title: string,
    description: string,
    priority: "low" | "medium" | "high",
    dueDate: string,
    workspaceId: string,
    assignedTo?: string,
    hasReminder?: boolean
  ) => {
    try {
      const tempId = `temp-${Date.now()}`;
      const tempTask: any = {
        id: tempId,
        title,
        description,
        status: "todo",
        priority,
        due_date: dueDate,
        workspace_id: workspaceId,
        assigned_to: assignedTo,
        progress: 0,
        comments: [],
        reactions: {},
        created_at: new Date().toISOString(),
        has_reminder: hasReminder,
      };
      setTasks((prev) => [tempTask, ...prev]);

      const newTask = await db.createTask({
        title,
        description,
        status: "todo",
        priority,
        due_date: dueDate,
        workspace_id: workspaceId,
        assigned_to: assignedTo,
      });

      if (hasReminder) {
        await db.updateTask(newTask.id, { has_reminder: true });
        setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...newTask, has_reminder: true } : t)));
      } else {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? newTask : t)));
      }
    } catch (err) {
      console.error("Task creation failed", err);
    }
  };

  const handleToggleTaskComplete = async (taskId: string, isCurrentlyComplete: boolean) => {
    try {
      const newStatus = isCurrentlyComplete ? "todo" : "completed";
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      await db.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error("Task complete toggle failed", err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      await db.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error("Task status update failed", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await db.deleteTask(taskId);
    } catch (err) {
      console.error("Task deletion failed", err);
    }
  };

  // --- Workspace Operations ---
  const handleAddWorkspace = async (name: string, icon: string, type: "personal" | "collaborative" = "personal", adminName?: string) => {
    try {
      const newWs = await db.createWorkspace(name, icon, type, adminName || profile?.display_name || "Admin");
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs.id); // Instantly switch to the new workspace
    } catch (err) {
      console.error("Workspace creation failed", err);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      const targetWorkspace = await db.joinWorkspace(roomId, profile?.display_name || "Guest");
      if (targetWorkspace) {
        setWorkspaces([targetWorkspace]);
        setActiveWorkspaceId(targetWorkspace.id);
        if (profile) {
          const updatedProfile = { ...profile, joined_room_id: targetWorkspace.id };
          setProfile(updatedProfile);
        }
        alert(`✨ Successfully joined ${targetWorkspace.name}! ✨`);
      } else {
        alert("Room not found. Please check the Room ID and try again.");
      }
    } catch (err) {
      console.error("Failed to join room", err);
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    try {
      const success = await db.deleteWorkspace(wsId);
      if (success) {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== wsId));
        // Delete tasks matching workspace locally
        setTasks((prev) => prev.filter((t) => t.workspace_id !== wsId));
        if (activeWorkspaceId === wsId) {
          setActiveWorkspaceId("all");
        }
      }
    } catch (err) {
      console.error("Workspace deletion failed", err);
    }
  };

  // --- Profile Operations ---
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await db.updateProfile(updates);
      setProfile(updated);
    } catch (err) {
      console.error("Profile update failed", err);
    }
  };

  // --- Habit Actions ---
  const handleToggleHabit = async (id: string, dateStr: string) => {
    try {
      const updated = await db.toggleHabit(id, dateStr);
      setHabits(updated);
    } catch (err) {
      console.error("Habit toggle failed", err);
    }
  };

  // --- Self-care Streak Action ---
  const handleIncrementStreak = async () => {
    try {
      const updated = await db.incrementStreak();
      setStreak(updated);
    } catch (err) {
      console.error("Streak increment failed", err);
    }
  };

  // Trigger global Add Task Modal
  const openAddTaskModal = (dateStr?: string) => {
    if (dateStr) {
      setAddTaskDue(dateStr);
    } else {
      setAddTaskDue(new Date().toISOString().split("T")[0]);
    }
    setAddTaskTitle("");
    setAddTaskDesc("");
    setAddTaskPriority("medium");
    setAddTaskReminder(false);
    if (workspaces.length > 0) {
      setAddTaskWorkspace(activeWorkspaceId === "all" ? workspaces[0].id : activeWorkspaceId);
    }
    setIsAddTaskModalOpen(true);
  };

  const submitAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTaskTitle.trim() || !addTaskWorkspace) return;
    
    if (addTaskReminder && typeof window !== 'undefined' && "Notification" in window) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    handleCreateTask(addTaskTitle.trim(), addTaskDesc.trim(), addTaskPriority, addTaskDue, effectiveAddTaskWorkspace, undefined, addTaskReminder);
    setIsAddTaskModalOpen(false);
  };

  // Render Loading Splash Screen
  if (isLoading) {
    const loadingMessages = [
      "✨ Preparing your focus space...",
      "🎯 Organizing your priorities...",
      "⚡ Syncing your productivity flow...",
      "🌊 Restoring calm and clarity..."
    ];

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 p-4">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300/10 rounded-full filter blur-3xl pointer-events-none animate-pulse duration-1000" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-300/10 rounded-full filter blur-3xl pointer-events-none animate-pulse duration-1000 delay-500" />

        <div className="w-full max-w-sm bg-white/60 backdrop-blur-md rounded-3xl p-10 border border-white shadow-xl relative z-10 animate-in zoom-in-95 fade-in duration-500">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-3xl animate-pulse">
              T
            </div>
            
            <div className="text-center space-y-1.5 w-full">
              <h3 className="font-black text-slate-800 text-xl tracking-tight">Sanctuary</h3>
              <p className="text-sm text-slate-500 font-bold">Your focus space awaits</p>
            </div>

            <div className="w-full space-y-4 pt-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center transition-all duration-300 h-4">
                {loadingMessages[loadingMsgIdx]}
              </p>
              
              {/* Animated Progress Dots */}
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i <= loadingMsgIdx ? "bg-blue-500 scale-110" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100/50 w-full text-center mt-2">
             <p className="text-[11px] text-slate-400 font-medium italic">
  &quot;Consistency beats intensity.&quot;
</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Login Card Overlay if no user profile
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f7fa] p-4">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-blue-300/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-indigo-300/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl relative z-10 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center shadow-md shadow-blue-500/10 text-white font-black text-2xl mb-3">
              T
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Enter Your Sanctuary</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5 justify-center">
              <Sparkles size={11} className="text-indigo-400" />
              <span>TaskFlow productivity studio</span>
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-600 font-semibold leading-relaxed">
                ✅ {authSuccess}
              </div>
            )}
            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@sanctuary.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Passphrase</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                  autoComplete={isSignUpMode ? "new-password" : "current-password"}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all pt-3.5 flex items-center justify-center gap-1.5"
            >
              <Shield size={14} />
              {isSignUpMode ? "Create Sanctuary Account" : "Access Sanctuary"}
            </button>
          </form>

          {/* Toggle Login/Sign Up Mode */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setAuthSuccess("");
                setAuthError("");
              }}
              className="text-xs text-slate-400 hover:text-blue-600 font-bold transition-colors"
            >
              {isSignUpMode ? "Already have a sanctuary account? Access here" : "Need a secure space? Register accounts here"}
            </button>
          </div>

          <div className="relative my-6 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <span className="relative bg-white px-3 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              Offline Sanctuary
            </span>
          </div>

          {/* Guest Login Option */}
          <button
            onClick={handleGuestEnter}
            className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-100 transition-all flex items-center justify-center gap-1.5"
          >
            <Smile size={14} />
            <span>Enter Guest Mode (Local Storage)</span>
          </button>

          {!isSupabaseConfigured && (
            <p className="text-[9px] text-slate-400 text-center font-semibold leading-relaxed mt-4">
              ℹ️ Supabase environment values not detected. Offline guest mode is fully interactive immediately!
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- Main Sanctuary Dashboard Shell ---
  const themeClass = profile?.theme === "dark" 
    ? "theme-dark" 
    : profile?.theme === "sunset" 
      ? "theme-sunset" 
      : "";

  const sizeClass = profile?.ui_size === "compact"
    ? "ui-compact"
    : profile?.ui_size === "large"
      ? "ui-large"
      : "ui-comfortable";

  return (
    <div className={`flex min-h-screen bg-[#f4f7fa] ${themeClass} ${sizeClass}`}>
      {/* Left Persistent Sidebar Navigation */}
      <Sidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
        workspaces={workspaces}
        onAddWorkspace={handleAddWorkspace}
        onJoinRoom={handleJoinRoom}
        profile={profile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto lg:pl-64">
        {/* Top Header Navigation bar */}
        <Header
          activeScreen={activeScreen}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          workspaces={workspaces}
          onOpenAddTaskModal={() => openAddTaskModal()}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Dynamic Screen Injector */}
        <main className="flex-1 px-3 py-1 sm:p-8 overflow-y-auto">
           {activeScreen === "dashboard" && (
            <DashboardScreen
              tasks={tasks}
              habits={habits}
              onToggleHabit={handleToggleHabit}
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              activeWorkspaceId={activeWorkspaceId}
              workspaces={workspaces}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onOpenTaskModal={openAddTaskModal}
              streak={streak}
              onIncrementStreak={handleIncrementStreak}
              onUpdateTask={async (id, updates) => {
                setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
                await db.updateTask(id, updates);
              }}
              onAddMember={async (wsId, name) => {
                setWorkspaces(prev => prev.map(w => w.id === wsId ? { ...w, members: [...(w.members || []), name] } : w));
                await db.addWorkspaceMember(wsId, name);
              }}
            />
          )}

          {activeScreen === "tasks" && (
            <TasksScreen
              tasks={tasks}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onToggleComplete={handleToggleTaskComplete}
              onDeleteTask={handleDeleteTask}
              onCreateTask={handleCreateTask}
              onUpdateTask={async (id, updates) => {
                const updated = await db.updateTask(id, updates);
                setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
                if (updates.assigned_to) {
                  alert(`🔔 Reminder sent to ${updates.assigned_to}: New task assigned!`);
                }
              }}
            />
          )}

          {activeScreen === "kanban" && (
            <KanbanScreen
              tasks={tasks}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenAddTaskModal={() => openAddTaskModal()}
            />
          )}

          {activeScreen === "calendar" && (
            <CalendarScreen
              tasks={tasks}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onOpenAddTaskModal={openAddTaskModal}
              onToggleComplete={handleToggleTaskComplete}
            />
          )}

          {activeScreen === "analytics" && (
            <AnalyticsScreen
              tasks={tasks}
              workspaces={workspaces}
              habits={habits}
              streak={streak}
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {activeScreen === "settings" && (
            <SettingsScreen
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              workspaces={workspaces}
              onAddWorkspace={handleAddWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              activeWorkspaceId={activeWorkspaceId}
              setActiveWorkspaceId={setActiveWorkspaceId}
            />
          )}
        </main>
      </div>

      {/* Sound Permission Prompt Banner */}
      {showSoundPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
          <div className="mx-4 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-slate-800">Enable reminder sounds?</h4>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Get audible chime alerts when tasks are approaching their due date.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    handleUpdateProfile({ sound_enabled: true });
                    setShowSoundPrompt(false);
                    playAlarmChime();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Volume2 size={13} /> Enable Sound
                </button>
                <button
                  onClick={() => {
                    handleUpdateProfile({ sound_enabled: false });
                    setShowSoundPrompt(false);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-xl border border-slate-100"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alarm Notification Toasts */}
      {alarmNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[200] space-y-2 w-full max-w-sm animate-in slide-in-from-right-4 duration-300">
          {alarmNotifications.map((alarm) => (
            <div key={alarm.taskId} className="bg-white border border-amber-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 animate-pulse">
                <BellRing size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">Task Reminder</span>
                <h4 className="font-bold text-sm text-slate-800 mt-0.5 truncate">&ldquo;{alarm.title}&rdquo;</h4>
                <span className="text-[10px] text-slate-400 font-semibold">Due: {alarm.dueDate}</span>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => {
                      try {
                        const updated = await db.updateTask(alarm.taskId, { status: "completed", progress: 100 });
                        setTasks((prev) => prev.map((t) => (t.id === alarm.taskId ? updated : t)));
                      } catch { /* ignore */ }
                      setAlarmNotifications((prev) => prev.filter((a) => a.taskId !== alarm.taskId));
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <CheckCircle2 size={11} /> Complete
                  </button>
                  <button
                    onClick={() => setAlarmNotifications((prev) => prev.filter((a) => a.taskId !== alarm.taskId))}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-100 flex items-center gap-1"
                  >
                    <X size={11} /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Add Task Modal Overlay */}
      <Modal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} title="Schedule New Sanctuary Task">
        <form onSubmit={submitAddTask} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Task Title</label>
            <input
              type="text"
              placeholder="e.g., Yoga Session, Project Outline"
              value={addTaskTitle}
              onChange={(e) => setAddTaskTitle(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Description (Optional)</label>
            <textarea
              placeholder="Details about task specs..."
              value={addTaskDesc}
              onChange={(e) => setAddTaskDesc(e.target.value)}
              rows={2}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Priority</label>
              <select
                value={addTaskPriority}
                onChange={(e) => setAddTaskPriority(e.target.value as any)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Target Date</label>
              <input
                type="date"
                value={addTaskDue}
                onChange={(e) => setAddTaskDue(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 font-semibold text-slate-600 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>



          {/* Reminder Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${addTaskReminder ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                {addTaskReminder ? <BellRing size={15} /> : <Bell size={15} />}
              </div>
              <div>
                <span className="font-bold text-xs text-slate-700 block">Set Reminder Alarm</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Get notified with sound when due</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddTaskReminder(!addTaskReminder)}
              className={`w-12 h-6 rounded-full p-1 transition-all ${addTaskReminder ? 'bg-amber-500 flex justify-end' : 'bg-slate-200 flex justify-start'}`}
            >
              <span className="w-4 h-4 bg-white rounded-full block shadow" />
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddTaskModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-colors"
            >
              Schedule Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
