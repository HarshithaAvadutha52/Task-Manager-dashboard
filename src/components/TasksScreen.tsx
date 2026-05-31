import React, { useState, useEffect } from "react";
import { Search, Filter, AlertCircle, Plus, Calendar as CalIcon, Trash2, CheckCircle2 } from "lucide-react";
import { Task, Workspace } from "@/lib/supabase";

interface TasksScreenProps {
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onToggleComplete: (id: string, isComplete: boolean) => void;
  onDeleteTask: (id: string) => void;
  onCreateTask: (title: string, desc: string, priority: "low" | "medium" | "high", due: string, wsId: string, assignedTo?: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  tasks,
  workspaces,
  activeWorkspaceId,
  onToggleComplete,
  onDeleteTask,
  onCreateTask,
  onUpdateTask,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Inline Quick Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskDue, setNewTaskDue] = useState(new Date().toISOString().split("T")[0]);
  const [newTaskWorkspace, setNewTaskWorkspace] = useState(activeWorkspaceId);

  const effectiveWorkspaceId = workspaces.find(w => w.id === newTaskWorkspace)
    ? newTaskWorkspace
    : workspaces.find(w => w.id === activeWorkspaceId)
      ? activeWorkspaceId
      : (workspaces[0]?.id || "");

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onCreateTask(
      newTaskTitle.trim(),
      newTaskDesc.trim(),
      newTaskPriority,
      newTaskDue,
      effectiveWorkspaceId
    );
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskPriority("medium");
    setIsQuickAddOpen(false);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    // Workspace Filter
    if (activeWorkspaceId !== "all") {
      if (task.workspace_id !== activeWorkspaceId) return false;
    } else {
      const ws = workspaces.find((w) => w.id === task.workspace_id);
      if (ws?.type !== "personal") return false;
    }

    // Search Query Filter
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Active Status Filter
    if (activeOnly && task.status === "completed") return false;

    // Priority Filter
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

    return true;
  });

  // Priority Styles mapping
  const priorityBadgeStyles: Record<string, string> = {
    high: "bg-rose-50 text-rose-600 border border-rose-100",
    medium: "bg-amber-50 text-amber-600 border border-amber-100",
    low: "bg-slate-50 text-slate-500 border border-slate-100",
  };

  // Status Styles mapping
  const statusBadgeStyles: Record<string, string> = {
    todo: "bg-blue-50 text-blue-600 border border-blue-100",
    in_progress: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    in_review: "bg-purple-50 text-purple-600 border border-purple-100",
    completed: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search within my tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Only Filter */}
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
              activeOnly
                ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Filter size={13} />
            <span>Active Only</span>
          </button>

          {/* Priority Filters Dropdown */}
          <div className="flex bg-white border border-slate-100 p-1 rounded-xl">
            {(["all", "high", "medium", "low"] as const).map((prio) => (
              <button
                key={prio}
                onClick={() => setPriorityFilter(prio)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  priorityFilter === prio
                    ? "bg-slate-100 text-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {prio}
              </button>
            ))}
          </div>

          {/* Quick Add Toggle */}
          <button
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              isQuickAddOpen
                ? "bg-slate-700 text-white hover:bg-slate-800"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100"
            }`}
          >
            <Plus size={13} />
            <span>Quick Task</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Section */}
      {isQuickAddOpen && (
        <form
          onSubmit={handleQuickAdd}
          className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Task Name
              </label>
              <input
                type="text"
                placeholder="What are you working on?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Give your future self some details..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 font-semibold text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-colors"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const taskWorkspace = workspaces.find((ws) => ws.id === task.workspace_id);

            return (
              <div
                key={task.id}
                className={`soft-card p-4 flex items-center justify-between gap-4 transition-all duration-200 ${
                  isCompleted
                    ? "bg-slate-50/50 border-slate-100 text-slate-400"
                    : "bg-white hover:border-slate-200"
                }`}
              >
                {/* Complete Checkbox */}
                <button
                  onClick={() => onToggleComplete(task.id, isCompleted)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                    isCompleted
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                >
                  {isCompleted && <CheckCircle2 size={15} strokeWidth={2.5} />}
                </button>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-semibold text-sm truncate leading-snug ${
                        isCompleted ? "line-through text-slate-400 decoration-slate-300 font-medium" : "text-slate-800"
                      }`}
                    >
                      {task.title}
                    </h4>
                    {/* Space Indicator Tag */}
                    {activeWorkspaceId === "all" && taskWorkspace && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                        {taskWorkspace.name}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p
                      className={`text-xs mt-1 truncate max-w-xl ${
                        isCompleted ? "line-through text-slate-300" : "text-slate-400 font-medium"
                      }`}
                    >
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Badges & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Status Badge */}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusBadgeStyles[task.status]}`}>
                    {task.status.replace("_", " ")}
                  </span>

                  {/* Priority Badge */}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${priorityBadgeStyles[task.priority]}`}>
                    {task.priority}
                  </span>

                  {/* Target Date Badge */}
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 border border-slate-100 bg-slate-50/50 px-2 py-1 rounded-full font-bold">
                      <CalIcon size={10} />
                      {task.due_date}
                    </span>
                  )}

                  {/* Assignee Dropdown for Collaborative Spaces */}
                  {taskWorkspace && taskWorkspace.type === "collaborative" && (
                    <select
                      value={task.assigned_to || ""}
                      onChange={(e) => onUpdateTask && onUpdateTask(task.id, { assigned_to: e.target.value })}
                      className="text-[10px] text-slate-600 font-semibold bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {(taskWorkspace.members || []).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors duration-200"
                    title="Delete Task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="soft-card p-12 text-center flex flex-col items-center justify-center bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3 shadow-inner">
              <AlertCircle size={22} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Nothing pending 🌿</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
              Enjoy the calm. Your journey begins here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
