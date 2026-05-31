import React, { useState } from "react";
import { Sparkles, Activity, BookOpen, Battery, Zap, Wind, Moon, Heart } from "lucide-react";
import { Task, Workspace, Habit, UserProfile } from "@/lib/supabase";

interface AnalyticsScreenProps {
  tasks: Task[];
  workspaces: Workspace[];
  habits: Habit[];
  streak: number;
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  tasks,
  workspaces,
  habits,
  streak,
  profile,
  onUpdateProfile,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Active habits logged today
  const completedHabitsToday = habits.filter((h) => h.completed_days.includes(todayStr));
  const habitRate = habits.length > 0 ? Math.round((completedHabitsToday.length / habits.length) * 100) : 0;

  // Dynamic Wellness Score calculation (for tiny insights preview)
  const wellnessScore = Math.min(
    100,
    Math.max(
      10,
      (streak * 4) + 
      (completedHabitsToday.length * 12) + 
      ((profile.focus_sessions || 0) * 15)
    )
  );

  // Local state for reflection input
  const [reflectionText, setReflectionText] = useState(profile.reflection_today || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateProfile({ reflection_today: reflectionText });
      alert("✨ Reflection logged in your sanctuary memory card! ✨");
    } catch {
      alert("Could not save reflection. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic past weekdays logic calculated from completed tasks
  const weekdayCounts: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  tasks.forEach((task) => {
    if (task.status === "completed" && task.due_date) {
      try {
        const dateObj = new Date(`${task.due_date}T00:00:00`);
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
        if (dayName in weekdayCounts) {
          weekdayCounts[dayName] += 1;
        }
      } catch (e) {
        // Safe skip
      }
    }
  });

  const weekdays = [
    { label: "Mon", count: weekdayCounts["Mon"] },
    { label: "Tue", count: weekdayCounts["Tue"] },
    { label: "Wed", count: weekdayCounts["Wed"] },
    { label: "Thu", count: weekdayCounts["Thu"] },
    { label: "Fri", count: weekdayCounts["Fri"] },
    { label: "Sat", count: weekdayCounts["Sat"] },
    { label: "Sun", count: weekdayCounts["Sun"] },
  ];
  const maxCount = Math.max(...weekdays.map((w) => w.count), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Daily Reflection Card at the Top (in place of banner) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3.5">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              Daily Reflection Card 💡
            </h3>
            <p className="text-xs text-slate-400 font-semibold">
              Capture what brought you peace and clarity today
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg">
            <Sparkles size={11} />
            <span>Reflections</span>
          </div>
        </div>

        <form onSubmit={handleSaveReflection} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <textarea
              placeholder="I found peace when taking a slow breath before starting work, or drinking hot herbal tea..."
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-slate-150 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-700 bg-slate-50/10"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/10 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <BookOpen size={14} />
            {isSaving ? "Logging..." : "Log Reflection Diary"}
          </button>
        </form>
      </div>

      {/* Main 3 Column Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Mindful Progress (Task & Habit circular consistency) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Mindful Progress</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Overall task completions & self-care ratio</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 my-6">
            {/* SVG Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="54" className="stroke-slate-50 fill-none" strokeWidth="8" />
                <circle
                  cx="72"
                  cy="72"
                  r="54"
                  className="stroke-indigo-500 fill-none transition-all duration-500 ease-out"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - completionRate / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{completionRate}%</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Completion</span>
              </div>
            </div>

            {/* Tiny elegant Wellness Score sub-indicator */}
            <div className="px-3.5 py-1.5 bg-emerald-50/60 border border-emerald-100/50 rounded-xl text-[10px] text-emerald-800 font-bold flex items-center justify-between gap-4 w-full shadow-inner">
              <span className="text-slate-400 uppercase tracking-wider font-extrabold text-[8px]">Sanctuary Score</span>
              <span className="text-emerald-700">{wellnessScore}% • Serene 🕊️</span>
            </div>

            {/* Checklist details of Habits Completed */}
            <div className="space-y-3 w-full">
              <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-2">
                <span className="text-slate-500">Daily Self-Cares</span>
                <span className="text-indigo-600">{completedHabitsToday.length}/{habits.length} Checked</span>
              </div>
              <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                {habits.map((habit) => {
                  const isDone = habit.completed_days.includes(todayStr);
                  return (
                    <div key={habit.id} className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span className="truncate">{habit.name}</span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? "bg-emerald-500 animate-pulse" : "bg-slate-200"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Deep Work & Focus Sessions (Pomodoro + Weekly Trends) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Weekly Focus Trends</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Completed tasks distribution over the week</p>
          </div>

          <div className="space-y-3 my-6 flex-1 flex flex-col justify-center">
            {weekdays.map((w) => {
              const barWidth = Math.round((w.count / maxCount) * 100);
              return (
                <div key={w.label} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 w-8 shrink-0">{w.label}</span>
                  <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        w.count > 0 ? "bg-indigo-500" : "bg-slate-200/55"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-700 w-8 text-right shrink-0">
                    {w.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Energy Levels Tracker */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Energy Levels Tracker</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Select your overall focus energy rating for today</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 my-6 flex-1 justify-center flex flex-col">
            {[
              { level: "Vibrant & Mindful ⚡", color: "text-amber-500 bg-amber-50/50 border-amber-100" },
              { level: "Steady & Calm 🍃", color: "text-emerald-600 bg-emerald-50/50 border-emerald-100" },
              { level: "Quiet & Reflective 🌊", color: "text-blue-600 bg-blue-50/50 border-blue-100" },
              { level: "Restful & Slow 💤", color: "text-purple-600 bg-purple-50/50 border-purple-100" },
            ].map((item) => {
              const isSelected = profile.energy_level === item.level;
              return (
                <button
                  key={item.level}
                  onClick={() => onUpdateProfile({ energy_level: item.level })}
                  className={`w-full py-3.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-center ${
                    isSelected
                      ? `${item.color} ring-2 ring-indigo-500/10 font-bold scale-[1.01] shadow-sm`
                      : "border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <span className="text-xs">{item.level}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
