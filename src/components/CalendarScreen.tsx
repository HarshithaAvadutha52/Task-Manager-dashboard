import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock, AlertCircle } from "lucide-react";
import { Task, Workspace } from "@/lib/supabase";

interface CalendarScreenProps {
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onOpenAddTaskModal: (preselectedDate?: string) => void;
  onToggleComplete: (id: string, isComplete: boolean) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  tasks,
  workspaces,
  activeWorkspaceId,
  onOpenAddTaskModal,
  onToggleComplete,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Filter tasks based on workspace
  const workspaceTasks = tasks.filter((t) => {
    if (activeWorkspaceId !== "all") return t.workspace_id === activeWorkspaceId;
    const ws = workspaces.find(w => w.id === t.workspace_id);
    return ws?.type === "personal";
  });

  // Month navigation handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Calculate calendar grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const daysGrid = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    return workspaceTasks.filter((t) => t.due_date === formattedDate);
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const priorityColors: Record<string, string> = {
    high: "bg-rose-500",
    medium: "bg-amber-400",
    low: "bg-slate-300",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-300">
      {/* Left 3 Columns: Calendar Grid */}
      <div className="lg:col-span-3 soft-card p-6 flex flex-col bg-white">
        {/* Calendar Header Controls */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Explore schedules and milestones</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-2 border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onOpenAddTaskModal(selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors ml-2"
            >
              <Plus size={12} />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-7 border-t border-l border-slate-100/50 flex-1 rounded-2xl overflow-hidden shadow-inner bg-slate-50/20">
          {daysGrid.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[90px] p-2 border-r border-b border-slate-100 bg-white hover:bg-slate-50/40 cursor-pointer flex flex-col justify-between transition-colors relative ${
                  !isCurrentMonth ? "text-slate-300 bg-slate-50/20" : "text-slate-700"
                } ${isSelected ? "ring-2 ring-blue-500/20 bg-blue-50/10 z-10" : ""}`}
              >
                {/* Day Number */}
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-blue-600 text-white font-black shadow-sm"
                        : isSelected
                        ? "bg-slate-100 text-slate-800"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Dot status of tasks */}
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayTasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Micro task list view */}
                <div className="mt-1 flex-1 overflow-hidden space-y-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate border leading-none ${
                        task.status === "completed"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600 line-through"
                          : "bg-slate-50 border-slate-100 text-slate-600"
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[8px] font-bold text-slate-400 text-right px-1">
                      +{dayTasks.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Selected Day Tasks Inspector Sidebar */}
      <div className="soft-card p-6 flex flex-col justify-between bg-white h-full">
        <div>
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-slate-800">
              {selectedDate ? format(selectedDate, "eeee, MMMM d") : "Schedule Inspector"}
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">
              Tasks Scheduled
            </span>
          </div>

          {/* Task list container */}
          <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
            {selectedDateTasks.length > 0 ? (
              selectedDateTasks.map((task) => {
                const isCompleted = task.status === "completed";
                const taskWorkspace = workspaces.find((ws) => ws.id === task.workspace_id);

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCompleted
                        ? "bg-slate-50 border-slate-100 text-slate-400"
                        : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-widest">
                        {taskWorkspace?.name || "Personal"}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`} />
                    </div>

                    <h4
                      className={`font-semibold text-xs leading-snug truncate ${
                        isCompleted ? "line-through text-slate-300 font-medium" : "text-slate-700"
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {task.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-50">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        {task.status.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => onToggleComplete(task.id, isCompleted)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                          isCompleted
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-white hover:bg-slate-50 border-slate-100 text-slate-500"
                        }`}
                      >
                        {isCompleted ? "Unmark" : "Complete"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-2 shadow-inner">
                  <AlertCircle size={18} />
                </div>
                <h5 className="font-bold text-slate-700 text-xs">No tasks scheduled</h5>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                  Enjoy a quiet day! Click &ldquo;+ Add Task&rdquo; if you wish to plan a new task.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Selected date quick scheduler button */}
        {selectedDate && (
          <button
            onClick={() => onOpenAddTaskModal(format(selectedDate, "yyyy-MM-dd"))}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 text-xs font-bold py-3 rounded-xl transition-all shrink-0 mt-6"
          >
            <Plus size={14} />
            <span>Schedule on this Date</span>
          </button>
        )}
      </div>
    </div>
  );
};
