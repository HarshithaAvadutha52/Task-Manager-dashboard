import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Coffee,
  Heart,
  Smile,
  Activity,
  Award,
  ListTodo,
  Trash2
} from "lucide-react";
import { Task, Habit, UserProfile, Workspace } from "@/lib/supabase";

interface DashboardProps {
  tasks: Task[];
  habits: Habit[];
  onToggleHabit: (id: string, dateStr: string) => void;
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  activeWorkspaceId: string;
  onCreateTask: (title: string, desc: string, priority: "low" | "medium" | "high", due: string, wsId: string) => void;
  streak: number;
  onIncrementStreak: () => void;
  workspaces: Workspace[];
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
  onAddMember?: (workspaceId: string, memberName: string) => Promise<void>;
  onOpenTaskModal?: () => void;
  onDeleteTask?: (id: string) => Promise<void>;
}

export const DashboardScreen: React.FC<DashboardProps> = ({
  tasks,
  habits,
  onToggleHabit,
  profile,
  onUpdateProfile,
  activeWorkspaceId,
  onCreateTask,
  streak,
  onIncrementStreak,
  workspaces,
  onUpdateTask,
  onAddMember,
  onOpenTaskModal,
  onDeleteTask
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  // Filter tasks matching current workspace, keeping collab tasks out of the 'all' view
  const workspaceTasks = tasks.filter((t) => {
    if (activeWorkspaceId !== "all") return t.workspace_id === activeWorkspaceId;
    const ws = workspaces.find(w => w.id === t.workspace_id);
    return ws?.type === "personal";
  });

  // --- Softer & More Natural Statistics ---
  // "In Progress": tasks not completed
  const inProgressCount = workspaceTasks.filter((t) => t.status !== "completed").length;
  // "Completed Today": completed tasks with due date matching today
  const completedTodayCount = workspaceTasks.filter((t) => t.status === "completed" && t.due_date === todayStr).length;

  // --- Dynamic Softer Greetings & Daily Quotes ---
  const softGreeting = `Welcome back, ${profile.display_name}!`;

  const dailyQuotes = [
    "Focus on being productive, not busy.",
    "One quiet task at a time is always enough.",
    "Action is the foundational key to all progress.",
    "Your mind is for having ideas, not holding them.",
    "Simplicity is the ultimate sophistication of planning.",
    "The secret of getting ahead is simply getting started.",
    "Plan your work for today, then work your plan.",
    "A goal without a clear plan is just a beautiful wish.",
    "Small daily improvements lead to stunning results.",
    "Concentrate all your thoughts upon the work at hand.",
    "Great things are done by a series of small things brought together.",
    "Focus on progress, never on perfection.",
    "Schedule your priorities instead of prioritizing your schedule.",
    "Clear minds focus clearly when clutter is cleared.",
    "Efficiency is doing things right; effectiveness is doing the right things.",
    "Do the hard tasks first. The easy ones will follow.",
    "Yesterday is gone. Today is a fresh, clean slate.",
    "The best way to predict the future is to create it.",
    "Quietly clear one hurdle, then move to the next.",
    "Your future is created by what you do today.",
    "Simplicity is the art of maximizing work not done.",
    "A single step begins the journey of a thousand miles.",
    "Discipline is the quiet bridge between goals and accomplishment.",
    "Organize your space, and clarity will naturally bloom.",
    "One mindful task at a time builds mountains.",
    "Patience and persistence are the keys to great achievements.",
    "Well begun is half done.",
    "Action cures fear and fuels beautiful progress.",
    "To manage your tasks is to manage your energy.",
    "Start where you are. Use what you have. Do what you can.",
    "Flow at your own steady, focused pace."
  ];
  const quoteIndex = (new Date().getDate() - 1) % dailyQuotes.length;
  const currentQuote = dailyQuotes[quoteIndex];

  // --- Calculate Active Task Reminders ---
  const activeReminders = profile.enable_reminders
    ? tasks.filter((task) => {
        if (task.status === "completed") return false;
        if (activeWorkspaceId !== "all" && task.workspace_id !== activeWorkspaceId) return false;
        
        // Ensure Collab tasks NEVER leak out of their specific workspace view
        const ws = workspaces.find(w => w.id === task.workspace_id);
        if (ws?.type !== "personal" && activeWorkspaceId !== task.workspace_id) {
           return false;
        }

        if (!task.due_date) return false;

        try {
          const dueTime = new Date(`${task.due_date}T00:00:00`).getTime();
          const nowTime = Date.now();
          const diffMs = dueTime - nowTime;
          const diffHours = diffMs / (3600 * 1000);
          const threshold = profile.reminder_threshold ?? 24;

          // Due within threshold and not past due by more than a day
          return diffHours <= threshold && diffHours >= -24;
        } catch {
          return false;
        }
      })
    : [];

  // --- Focus Timer States ---
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMaxSeconds, setTimerMaxSeconds] = useState(25 * 60);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Layout density states ---
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);

  // --- Quick Checklist States ---
  const [quickChecklist, setQuickChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: "qc-1", text: "Take 3 deep mindful breaths", done: true },
    { id: "qc-2", text: "Stretch shoulders & neck", done: false },
    { id: "qc-3", text: "Hydrate: Drink a full glass of water", done: false },
    { id: "qc-4", text: "Write down 1 thing you are grateful for", done: false },
  ]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const [newMemberName, setNewMemberName] = useState("");

  // Personal Focus Timer countdown effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            onIncrementStreak(); // Completed a session! Increment streak
            
            // Increment focus sessions in user profile
            if (onUpdateProfile) {
              onUpdateProfile({ focus_sessions: (profile.focus_sessions || 0) + 1 });
            }
            
            alert("✨ Wonderful focus! Take a 5-minute break now. ✨");
            return timerMaxSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerMaxSeconds, onIncrementStreak, profile.focus_sessions, onUpdateProfile]);

  // Format focus time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Add Focus Checklist Item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    setQuickChecklist((prev) => [
      ...prev,
      { id: `qc-${Date.now()}`, text: newChecklistItem.trim(), done: false },
    ]);
    setNewChecklistItem("");
  };

  // Toggle Focus Checklist Item
  const handleToggleChecklist = (id: string) => {
    setQuickChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleDeleteChecklist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setQuickChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  // SVG circular timer calculations
  const progressRatio = timerSeconds / timerMaxSeconds;
  const strokeDashoffset = 2 * Math.PI * 90 * (1 - progressRatio);

  // Filter out dismissed reminders
  const visibleReminders = activeReminders.filter((r) => !dismissedReminders.includes(r.id));

  const displayedChecklist = showAllChecklist ? quickChecklist : quickChecklist.slice(0, 3);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // --- COLLABORATIVE DASHBOARD ---
  if (activeWorkspace?.type === "collaborative") {
    const members = activeWorkspace.members || [profile.display_name || "Admin"];
    const adminName = activeWorkspace.admin_name || profile.display_name || "Admin";
    const sprint = activeWorkspace.sprint || "Current Sprint";

    return (
      <div className="space-y-6 animate-in fade-in duration-300">

        {/* 3 Compact Stat Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Tasks</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                {inProgressCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50/70 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner border border-indigo-100/10">
              <ListTodo size={18} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                {completedTodayCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner border border-emerald-100/10">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Members</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                {members.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50/70 text-blue-600 flex items-center justify-center shrink-0 shadow-inner border border-blue-100/10">
              <Smile size={18} />
            </div>
          </div>
        </div>

        {/* Main Layout: Members & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Members List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Team Roster</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Members in this room</p>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {members.map(member => (
                <div key={member} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {member.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 truncate">{member}</span>
                </div>
              ))}
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newMemberName.trim() && onAddMember) {
                  onAddMember(activeWorkspaceId, newMemberName.trim());
                  setNewMemberName("");
                }
              }}
              className="mt-2 flex gap-2"
            >
              <input
                type="text"
                placeholder="New Member Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-150 focus:outline-none focus:border-blue-500 font-semibold"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center justify-center"
              >
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Team Tasks */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Team Tasks</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Assign and track team progress</p>
              </div>
              <button
                onClick={() => onOpenTaskModal?.()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> New Task
              </button>
            </div>
            
            <div className="space-y-3">
              {workspaceTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No team tasks yet. Assign one above!
                </div>
              ) : (
                workspaceTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-150 shadow-sm bg-white hover:border-blue-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onUpdateTask && onUpdateTask(task.id, { status: task.status === "completed" ? "todo" : "completed", progress: task.status === "completed" ? 0 : 100 })}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400 text-transparent hover:text-emerald-100"
                        }`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <div>
                        <h4 className={`text-sm font-bold ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                            task.priority === "high" ? "bg-rose-50 text-rose-600" : task.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                          }`}>
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Clock size={10} /> {task.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <select
                        value={task.assigned_to || ""}
                        onChange={(e) => onUpdateTask && onUpdateTask(task.id, { assigned_to: e.target.value })}
                        className="text-[10px] text-slate-600 font-semibold bg-slate-50 border border-slate-200 rounded p-1 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {members.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => onDeleteTask && onDeleteTask(task.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors mt-auto"
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PERSONAL DASHBOARD ---
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Premium Minimal Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 pt-2 gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Welcome back, {profile.display_name}! 🌿
          </h2>
          <p className="text-xs text-slate-450 font-semibold italic max-w-xl leading-relaxed">
            &ldquo;{currentQuote}&rdquo;
          </p>
        </div>
        
        {/* Gentle Premium Emotional Indicator */}
        <div className="shrink-0 z-10 bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-left md:text-right shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Today&apos;s Intention</span>
          <span className="text-xs font-bold text-slate-700 block mt-1.5 flex items-center gap-1 md:justify-end">
            Deep Focus <span className="text-emerald-500">🌿</span>
          </span>
        </div>
      </div>

      {/* Dynamic Task Reminders Banners (Thinner & Dismissible Strip) */}
      {visibleReminders.length > 0 && (
        <div className="space-y-1.5">
          {visibleReminders.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between py-2 px-4 bg-amber-50/50 border border-amber-100/60 rounded-xl text-[11px] font-semibold text-amber-800 animate-in slide-in-from-top-2 duration-300"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="truncate">
                  ⚠️ <span className="font-bold">Due today:</span> &ldquo;{task.title}&rdquo; (Due: {task.due_date})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    if (onUpdateTask) {
                      await onUpdateTask(task.id, { status: "completed", progress: 100 });
                      alert("✨ Outstanding job! Task marked complete from reminders! ✨");
                    }
                  }}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors text-[9px] uppercase tracking-wider"
                >
                  Complete
                </button>
                <button
                  onClick={() => setDismissedReminders((prev) => [...prev, task.id])}
                  className="text-amber-500 hover:text-amber-700 px-1 font-bold text-xs"
                  title="Dismiss reminder"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4 Compact Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-slate-250">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Tasks</span>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              {inProgressCount}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium block truncate">Keep flowing smoothly</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50/70 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner border border-indigo-100/10">
            <ListTodo size={18} />
          </div>
        </div>

        {/* Card 2: Completed Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-slate-250">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Today</span>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              {completedTodayCount}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium block truncate">Beautiful milestones today</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner border border-emerald-100/10">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 3: Focus Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-slate-250">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Focus Time</span>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              {((profile.focus_sessions || 0) * 25) >= 60
                ? `${(((profile.focus_sessions || 0) * 25) / 60).toFixed(1)} hrs`
                : `${(profile.focus_sessions || 0) * 25} mins`}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium block truncate">Deep work finished</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50/70 text-blue-600 flex items-center justify-center shrink-0 shadow-inner border border-blue-100/10">
            <Clock size={18} />
          </div>
        </div>

        {/* Card 4: Current Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-slate-250">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Streak</span>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              {streak} Days
            </h3>
            <span className="text-[9px] text-slate-400 font-medium block truncate">Consistency in action</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50/70 text-amber-500 flex items-center justify-center shrink-0 shadow-inner border border-amber-100/10">
            <Flame size={18} />
          </div>
        </div>
      </div>

      {/* Main Grid: Collapsed Checklist and Compact Focus Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Collapsible Focus Checklist */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Sanctuary Focus Checklist</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Mindful daily habits for overall wellbeing</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full">
                {quickChecklist.filter((qc) => qc.done).length}/{quickChecklist.length} Completed
              </span>
            </div>

            {/* Checklist List */}
            <div className="space-y-2.5">
              {displayedChecklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    item.done
                      ? "bg-slate-50 border-slate-100 text-slate-400"
                      : "bg-white border-slate-100 shadow-sm hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                      item.done
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-slate-300 hover:border-slate-400 bg-white"
                    }`}
                  >
                    {item.done && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-semibold flex-1 leading-snug">{item.text}</span>
                  <button
                    onClick={(e) => handleDeleteChecklist(e, item.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {quickChecklist.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllChecklist(!showAllChecklist)}
                className="mt-3 px-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                {showAllChecklist ? "Collapse List ⌃" : `View all ${quickChecklist.length} habits ⌄`}
              </button>
            )}
          </div>

          {/* Quick Add Checklist Form */}
          <form onSubmit={handleAddChecklistItem} className="mt-6 flex items-center gap-2">
            <input
              type="text"
              placeholder="Add quick self-care goal..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              className="flex-1 text-sm px-4 py-3 rounded-xl border border-slate-150 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
            />
            <button
              type="submit"
              className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all shadow-sm flex items-center justify-center"
            >
              <Plus size={18} />
            </button>
          </form>
        </div>

        {/* Right Column: Compact Focus Timer Preview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Focus Timer</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Flow state Pomodoro preview</p>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase ${
                isTimerRunning 
                  ? "bg-emerald-50 text-emerald-600 animate-pulse border border-emerald-100/50" 
                  : "bg-slate-50 text-slate-500 border border-slate-100"
              }`}>
                {isTimerRunning ? "Running" : "Paused"}
              </span>
            </div>

            {/* Time display and minimal controls */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="text-5xl font-black text-slate-800 tracking-tighter font-mono bg-slate-50/50 px-6 py-3 rounded-2xl border border-slate-100/60 shadow-inner">
                {formatTime(timerSeconds)}
              </div>
              
              {/* Controls */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                    isTimerRunning
                      ? "bg-slate-750 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
                  }`}
                >
                  {isTimerRunning ? "Pause" : "Start"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(timerMaxSeconds);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-150 transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Trigger button for immersive full screen focus mode */}
          <button
            type="button"
            onClick={() => setIsTimerModalOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-600 hover:text-indigo-700 border border-indigo-100/40 rounded-xl font-bold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5 mt-4"
          >
            <Sparkles size={14} className="animate-pulse" />
            Open Immersive Focus Mode 🌿
          </button>
        </div>

      </div>

      {/* Full-Screen Immersive Focus Modal */}
      {isTimerModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg p-8 mx-4 bg-white/95 rounded-3xl border border-slate-100/80 shadow-2xl flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
            {/* Close Button / Minimize */}
            <button
              onClick={() => setIsTimerModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 transition-colors shadow-sm text-xs font-bold flex items-center gap-1"
              title="Minimize Focus Mode"
            >
              <span>Minimize</span>
              <span className="text-[10px]">⌃</span>
            </button>

            <div className="w-full text-center pb-2 mb-6">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Focus Sanctuary</span>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Focusing Mindfully</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Let go of distractions and sink into your flow.</p>
            </div>

            {/* Circular SVG Timer */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="105"
                  className="stroke-slate-100 fill-none"
                  strokeWidth="8"
                />
                {/* Animated Progress Circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="105"
                  className="stroke-blue-500 fill-none transition-all duration-300 ease-linear"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 105}
                  strokeDashoffset={2 * Math.PI * 105 * (1 - progressRatio)}
                  strokeLinecap="round"
                />
              </svg>

              {/* Inner Content */}
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-4xl font-black text-slate-800 tracking-tight font-mono">
                  {formatTime(timerSeconds)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {isTimerRunning ? "Flow State" : "Paused"}
                </span>
              </div>

              {/* Ambient pulsing glow rings around the timer */}
              {isTimerRunning && (
                <div className="absolute inset-0 rounded-full border border-blue-200/40 timer-pulse pointer-events-none" />
              )}
            </div>

            {/* Timer Presets Selection Controls */}
            <div className="flex gap-2 mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
              {[25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  disabled={isTimerRunning}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerMaxSeconds(mins * 60);
                    setTimerSeconds(mins * 60);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    timerMaxSeconds === mins * 60
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "hover:bg-slate-150 text-slate-500 disabled:opacity-50"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Core Action Controls inside modal */}
            <div className="flex items-center gap-4 w-full max-w-sm px-4">
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(timerMaxSeconds);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs transition-colors"
              >
                <RotateCcw size={14} />
                Reset
              </button>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-[1.5] flex items-center justify-center gap-1.5 py-3 rounded-xl text-white font-bold text-xs transition-all shadow-md ${
                  isTimerRunning
                    ? "bg-slate-700 hover:bg-slate-800 shadow-slate-200/50"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause size={14} fill="white" /> Pause Flow
                  </>
                ) : (
                  <>
                    <Play size={14} fill="white" /> Start Flow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
