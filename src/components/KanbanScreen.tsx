import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AlertCircle, Calendar as CalIcon, Plus, User, Sparkles } from "lucide-react";
import { Task, Workspace } from "@/lib/supabase";

interface KanbanScreenProps {
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onUpdateTaskStatus: (id: string, newStatus: Task["status"]) => void;
  onOpenAddTaskModal: () => void;
}

export const KanbanScreen: React.FC<KanbanScreenProps> = ({
  tasks,
  workspaces,
  activeWorkspaceId,
  onUpdateTaskStatus,
  onOpenAddTaskModal,
}) => {
  // Filter tasks based on active workspace
  const workspaceTasks = tasks.filter((t) => {
    if (activeWorkspaceId !== "all") return t.workspace_id === activeWorkspaceId;
    const ws = workspaces.find(w => w.id === t.workspace_id);
    return ws?.type === "personal";
  });

  // Define Columns
  const columns: { id: Task["status"]; title: string; color: string; border: string; dot: string }[] = [
    { id: "todo", title: "To Do", color: "bg-slate-50 text-slate-700", border: "border-slate-100", dot: "bg-slate-400" },
    { id: "in_progress", title: "In Progress", color: "bg-blue-50/50 text-blue-700", border: "border-blue-100/50", dot: "bg-blue-500" },
    { id: "in_review", title: "In Review", color: "bg-purple-50/50 text-purple-700", border: "border-purple-100/50", dot: "bg-purple-500" },
    { id: "completed", title: "Completed", color: "bg-emerald-50/50 text-emerald-700", border: "border-emerald-100/50", dot: "bg-emerald-500" },
  ];

  // Group tasks by status
  const tasksByStatus: Record<Task["status"], Task[]> = {
    todo: workspaceTasks.filter((t) => t.status === "todo"),
    in_progress: workspaceTasks.filter((t) => t.status === "in_progress"),
    in_review: workspaceTasks.filter((t) => t.status === "in_review"),
    completed: workspaceTasks.filter((t) => t.status === "completed"),
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Check if the task was dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Since our database updates the status, we trigger status change!
    const newStatus = destination.droppableId as Task["status"];
    onUpdateTaskStatus(draggableId, newStatus);
  };

  const priorityColors: Record<string, string> = {
    high: "bg-rose-500",
    medium: "bg-amber-400",
    low: "bg-slate-300",
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-300">
      {/* Kanban Info Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs text-slate-400 font-semibold">
            Drag and drop tasks between columns to update status instantly.
          </p>
        </div>
        <button
          onClick={onOpenAddTaskModal}
          className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
        >
          <Plus size={14} /> Add Card
        </button>
      </div>

      {/* Drag & Drop Context */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-5 flex-1 overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto min-h-0 pb-4 pr-1 sm:pr-2 select-none">
          {columns.map((column) => {
            const columnTasks = tasksByStatus[column.id];

            return (
              <div
                key={column.id}
                className="flex flex-col h-auto lg:h-full bg-slate-50/60 border border-slate-200 rounded-2xl p-4 w-full lg:min-w-[220px] lg:max-w-[320px] lg:flex-1 shrink-0"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${column.dot} shrink-0`} />
                    <h3 className="font-bold text-sm text-slate-700 tracking-tight">{column.title}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-3 rounded-xl p-1 transition-colors duration-200 ${
                        snapshot.isDraggingOver ? "bg-slate-50/80 border-2 border-dashed border-blue-200/50" : ""
                      }`}
                      style={{ minHeight: "150px" }}
                    >
                      {columnTasks.length > 0 ? (
                        columnTasks.map((task, index) => {
                          const taskWorkspace = workspaces.find((w) => w.id === task.workspace_id);

                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all select-none ${
                                    snapshot.isDragging ? "shadow-xl border-blue-200 ring-2 ring-blue-500/5 rotate-2 scale-102" : "shadow-sm"
                                  }`}
                                >
                                  {/* Top Card Meta */}
                                  <div className="flex items-center justify-between mb-2">
                                    {/* Workspace Badge */}
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                      {taskWorkspace?.name || "Personal Space"}
                                    </span>
                                    {/* Priority Indicator */}
                                    <div className="flex items-center gap-1">
                                      <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {task.priority}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Task Title */}
                                  <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1">
                                    {task.title}
                                  </h4>

                                  {/* Task Description */}
                                  {task.description && (
                                    <p className="text-xs text-slate-400 font-semibold line-clamp-2 leading-relaxed mb-3">
                                      {task.description}
                                    </p>
                                  )}

                                  {/* Bottom Card Meta */}
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-bold">
                                    {/* Due Date */}
                                    <span className="flex items-center gap-1">
                                      <CalIcon size={10} />
                                      {task.due_date}
                                    </span>
                                    {/* Assignee Badge */}
                                    <span className="flex items-center gap-0.5 bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-widest font-black max-w-[80px] truncate">
                                      <User size={8} className="shrink-0" />
                                      <span className="truncate">{task.assigned_to || "Unassigned"}</span>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-xl bg-white/10 min-h-[140px]">
                          <span className="text-[9px] font-bold text-slate-400/80 uppercase tracking-widest">All clear ✨</span>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
