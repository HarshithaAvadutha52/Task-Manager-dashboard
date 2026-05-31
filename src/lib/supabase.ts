import { createClient } from "@supabase/supabase-js";

// Attempt to read Supabase environment variables safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

// Initialize actual Supabase client if keys are present
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// TYPES DEFINITIONS
// ==========================================
export interface Workspace {
  id: string;
  name: string;
  icon: string;
  type?: "personal" | "collaborative";
  room_id?: string;
  admin_name?: string;
  members?: string[];
  sprint?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string; // ISO String (YYYY-MM-DD)
  workspace_id: string;
  created_at: string;
  assigned_to?: string;
  progress?: number;
  has_reminder?: boolean;
  comments?: { id: string; user: string; text: string }[];
  reactions?: Record<string, number>;
}

export interface Habit {
  id: string;
  name: string;
  completed_days: string[]; // ISO Strings (YYYY-MM-DD)
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_icon: string; // Lucide icon name
  email: string;
  theme?: "light" | "dark" | "sunset";
  ui_size?: "compact" | "comfortable" | "large";
  sound_enabled?: boolean;
  status_message?: string;
  enable_reminders?: boolean;
  reminder_threshold?: number;
  focus_sessions?: number;
  reflection_today?: string;
  energy_level?: string;
  current_mood?: string;
  joined_room_id?: string;
}

// ==========================================
// DEFAULT SEED DATA
// ==========================================
const DEFAULT_WORKSPACES: Workspace[] = [
  { id: "personal", name: "Personal Space", icon: "User", type: "personal" },
  { id: "demo-collab", name: "Demo Collab Room", icon: "Users", type: "collaborative", room_id: "demo-room-123", admin_name: "Admin", members: ["Demo"] }
];

const DEFAULT_TASKS: Task[] = [];

const DEFAULT_HABITS: Habit[] = [
  { id: "habit-1", name: "Meditate 10 mins", completed_days: [] },
  { id: "habit-2", name: "Drink 3L Water", completed_days: [] },
  { id: "habit-3", name: "Read Book", completed_days: [] },
  { id: "habit-4", name: "No Sugar", completed_days: [] },
  { id: "habit-5", name: "Journal Daily", completed_days: [] },
];

const DEFAULT_PROFILE: UserProfile = {
  id: "guest-user",
  display_name: "Demo",
  avatar_icon: "Sparkles",
  email: "demo@gmail.com",
  theme: "light",
  ui_size: "comfortable",
  status_message: "Flowing deeply...",
  enable_reminders: true,
  reminder_threshold: 24,
  focus_sessions: 0,
  reflection_today: "",
  energy_level: "Steady & Calm 🍃",
  current_mood: "Peaceful 🕊️",
};

// ==========================================
// COZY DATA SYNCHRONIZATION LAYER
// ==========================================

// Helper to initialize local storage
const initLocalStorage = () => {
  if (typeof window === "undefined") return;

  // Selective dynamic cache clearing to drop previous dummy tasks and names
  if (!localStorage.getItem("tf_clean_v7")) {
    localStorage.removeItem("tf_workspaces");
    localStorage.removeItem("tf_tasks");
    localStorage.removeItem("tf_habits");
    localStorage.removeItem("tf_profile");
    localStorage.removeItem("tf_selfcare_streak");
    localStorage.setItem("tf_clean_v7", "true");
  }

  if (!localStorage.getItem("tf_workspaces")) {
    localStorage.setItem("tf_workspaces", JSON.stringify(DEFAULT_WORKSPACES));
  }
  if (!localStorage.getItem("tf_tasks")) {
    localStorage.setItem("tf_tasks", JSON.stringify(DEFAULT_TASKS));
  }
  if (!localStorage.getItem("tf_habits")) {
    localStorage.setItem("tf_habits", JSON.stringify(DEFAULT_HABITS));
  }
  // Do not auto-initialize tf_profile here so we can show login screen
  if (!localStorage.getItem("tf_selfcare_streak")) {
    localStorage.setItem("tf_selfcare_streak", "0");
  }
};

const isGuestModeActive = () => typeof window !== "undefined" && (JSON.parse(localStorage.getItem("tf_profile") || "{}")?.id === "guest-user");

export const db = {
  // --- Auth Session ---
  async getSessionUser(): Promise<UserProfile | null> {
    initLocalStorage();
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Query profile from Supabase
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          return {
            id: user.id,
            display_name: data.display_name || user.email?.split("@")[0] || "Gentle Soul",
            avatar_icon: data.avatar_icon || "User",
            email: user.email || "",
          };
        }
        return {
          id: user.id,
          display_name: user.email?.split("@")[0] || "Gentle Soul",
          avatar_icon: "User",
          email: user.email || "",
        };
      }
    }
    // Guest User logic
    if (typeof window !== "undefined") {
      const profileStr = localStorage.getItem("tf_profile");
      return profileStr ? JSON.parse(profileStr) : null;
    }
    return null;
  },

  async signUp(email: string, pass: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            display_name: email.split("@")[0],
            avatar_icon: "User",
            email: email,
          };
          // Upsert into Supabase profile
          await supabase.from("profiles").upsert({
            id: data.user.id,
            display_name: profile.display_name,
            avatar_icon: profile.avatar_icon,
          });
          if (typeof window !== "undefined") {
            localStorage.setItem("tf_profile", JSON.stringify(profile));
          }
          return profile;
        }
      } catch (err: any) {
        if (err.message === "Failed to fetch" || err.message?.includes("fetch")) {
          console.warn("Supabase offline, falling back to local storage auth.", err);
        } else {
          throw err;
        }
      }
    }
    // Guest mock setup
    const newProfile = { ...DEFAULT_PROFILE, id: `user-${Date.now()}`, email, display_name: email.split("@")[0] };
    localStorage.setItem("tf_profile", JSON.stringify(newProfile));
    return newProfile;
  },

  async signIn(email: string, pass: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
          const profile = {
            id: data.user.id,
            display_name: profileData?.display_name || email.split("@")[0],
            avatar_icon: profileData?.avatar_icon || "User",
            email: data.user.email || "",
          };
          if (typeof window !== "undefined") {
            localStorage.setItem("tf_profile", JSON.stringify(profile));
          }
          return profile;
        }
      } catch (err: any) {
        if (err.message === "Failed to fetch" || err.message?.includes("fetch")) {
          console.warn("Supabase offline, falling back to local storage auth.", err);
        } else {
          throw err;
        }
      }
    }
    // Guest mock login
    const newProfile = { ...DEFAULT_PROFILE, id: "guest-user", email, display_name: email.split("@")[0] };
    localStorage.setItem("tf_profile", JSON.stringify(newProfile));
    return newProfile;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      await supabase.auth.signOut();
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("tf_profile");
    }
  },

  // --- Profile CRUD ---
  async getProfile(): Promise<UserProfile> {
    initLocalStorage();
    const user = await this.getSessionUser();
    return user || DEFAULT_PROFILE;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    initLocalStorage();
    const current = await this.getProfile();
    const updated = { ...current, ...updates };

    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            display_name: updated.display_name,
            avatar_icon: updated.avatar_icon,
          });
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("tf_profile", JSON.stringify(updated));
    }
    return updated;
  },

  // --- Workspaces CRUD ---
  async getWorkspaces(): Promise<Workspace[]> {
    initLocalStorage();
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data, error } = await supabase.from("workspaces").select("*");
      if (!error && data) {
        if (data.length === 0) {
          // Auto-create default personal workspace for new users
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const defaultWs: any = {
              id: `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: "Personal Space",
              icon: "User",
              type: "personal",
              user_id: user.id
            };
            const { data: newWs } = await supabase.from("workspaces").insert(defaultWs).select().single();
            if (newWs) return [newWs];
          }
          // If we reach here, it means data.length === 0 BUT we couldn't auto-create a workspace 
          // (likely because the user has an unconfirmed email and thus no session, or is in Guest mode).
          // We must NOT return [], otherwise the UI dropdowns will be completely blank.
          // Instead, we skip returning and let it fall through to the local storage fallback below!
        } else {
          return data;
        }
      }
    }
    if (typeof window !== "undefined") {
      let wss = JSON.parse(localStorage.getItem("tf_workspaces") || "[]");
      const dummyNames = ["Gentle Soul (Admin)", "Alex Flow", "Priya Wire", "Zen Developer", "Harshitha", "Gentle Soul"];
      wss = wss.map((ws: Workspace) => {
        if (ws.members) {
          ws.members = ws.members.filter((m: string) => !dummyNames.includes(m));
          if (ws.members.length === 0) ws.members.push("Admin");
        }
        if (dummyNames.includes(ws.admin_name || "")) {
          ws.admin_name = "Admin";
        }
        return ws;
      });
      return wss;
    }
    return DEFAULT_WORKSPACES;
  },

  async createWorkspace(name: string, icon = "Briefcase", type: "personal" | "collaborative" = "personal", creatorName = "Admin"): Promise<Workspace> {
    initLocalStorage();
    const isCollab = type === "collaborative";
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      icon,
      type,
      room_id: isCollab ? `ROOM-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      admin_name: isCollab ? creatorName : undefined,
      members: isCollab ? [creatorName] : undefined,
      sprint: isCollab ? "Sprint 1 Active" : undefined
    };

    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("workspaces")
          .insert({ name, icon, type, user_id: user.id })
          .select()
          .single();
        if (data) return data;
      }
    }

    if (typeof window !== "undefined") {
      const wss = JSON.parse(localStorage.getItem("tf_workspaces") || "[]");
      wss.push(newWorkspace);
      localStorage.setItem("tf_workspaces", JSON.stringify(wss));
    }
    return newWorkspace;
  },

  async joinWorkspace(roomId: string, memberName: string): Promise<Workspace | null> {
    initLocalStorage();
    
    // Fallback to Local Storage Mocking since we aren't guaranteed real DB tables
    if (typeof window !== "undefined") {
      let wss: Workspace[] = JSON.parse(localStorage.getItem("tf_workspaces") || "[]");
      let target = wss.find(w => w.room_id === roomId);
      
      if (!target) {
        // If room doesn't exist locally, fake it so the UI flow works for demonstration
        target = {
          id: `ws-${Date.now()}`,
          name: "Joined Team Room",
          icon: "Users",
          type: "collaborative",
          room_id: roomId,
          admin_name: "Admin",
          members: ["Admin", memberName],
          sprint: "Sprint 1 Active"
        };
        wss.push(target);
      } else {
        // Add member to existing local room
        if (!target.members) target.members = [];
        if (!target.members.includes(memberName)) {
          target.members.push(memberName);
        }
      }
      
      localStorage.setItem("tf_workspaces", JSON.stringify(wss));
      
      // Update profile to be locked into this room
      const profileStr = localStorage.getItem("tf_profile");
      if (profileStr) {
        const p = JSON.parse(profileStr);
        p.joined_room_id = target.id;
        localStorage.setItem("tf_profile", JSON.stringify(p));
      }
      return target;
    }
    return null;
  },

  async deleteWorkspace(id: string): Promise<boolean> {
    initLocalStorage();
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { error } = await supabase.from("workspaces").delete().eq("id", id);
      if (error) return false;
    }
    if (typeof window !== "undefined") {
      const current = await this.getWorkspaces();
      const updated = current.filter((ws) => ws.id !== id);
      localStorage.setItem("tf_workspaces", JSON.stringify(updated));
      // Delete tasks associated with this workspace as well
      const tasks = await this.getAllTasks();
      const updatedTasks = tasks.filter((t) => t.workspace_id !== id);
      localStorage.setItem("tf_tasks", JSON.stringify(updatedTasks));
    }
    return true;
  },

  async addWorkspaceMember(wsId: string, memberName: string): Promise<boolean> {
    initLocalStorage();
    
    // Fallback: local storage
    if (typeof window !== "undefined") {
      const current = await this.getWorkspaces();
      const idx = current.findIndex(w => w.id === wsId);
      if (idx !== -1 && current[idx].type === "collaborative") {
        const members = current[idx].members || [];
        if (!members.includes(memberName)) {
          current[idx].members = [...members, memberName];
          localStorage.setItem("tf_workspaces", JSON.stringify(current));
        }
      }
    }
    return true;
  },

  // --- Tasks CRUD ---
  async getAllTasks(): Promise<Task[]> {
    initLocalStorage();
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    }
    if (typeof window !== "undefined") {
      let tasks = JSON.parse(localStorage.getItem("tf_tasks") || "[]");
      // MIGRATION: One-time wipe of all dummy tasks per user request
      if (localStorage.getItem("tf_tasks_wiped_v2") !== "true") {
        tasks = [];
        localStorage.setItem("tf_tasks", "[]");
        localStorage.setItem("tf_tasks_wiped_v2", "true");
      }
      return tasks;
    }
    return DEFAULT_TASKS;
  },

  async getTasks(workspaceId: string): Promise<Task[]> {
    const all = await this.getAllTasks();
    if (workspaceId === "all") return all;
    return all.filter((t) => t.workspace_id === workspaceId);
  },

  async createTask(taskData: Omit<Task, "id" | "created_at">): Promise<Task> {
    initLocalStorage();
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      created_at: new Date().toISOString(),
      progress: taskData.progress ?? 0,
      comments: taskData.comments ?? [],
      reactions: taskData.reactions ?? {},
      assigned_to: taskData.assigned_to,
    };

    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("tasks")
          .insert({
            id: newTask.id,
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            due_date: taskData.due_date,
            workspace_id: taskData.workspace_id,
            user_id: session.user.id,
            assigned_to: taskData.assigned_to,
            progress: taskData.progress ?? 0,
            comments: taskData.comments ?? [],
            reactions: taskData.reactions ?? {},
            created_at: newTask.created_at,
          })
          .select()
          .single();
        if (data) return data;
      }
    }

    if (typeof window !== "undefined") {
      const current = await this.getAllTasks();
      const updated = [newTask, ...current];
      localStorage.setItem("tf_tasks", JSON.stringify(updated));
    }
    return newTask;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    initLocalStorage();
    const all = await this.getAllTasks();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Task not found");

    const updatedTask = { ...all[idx], ...updates };

    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data } = await supabase
        .from("tasks")
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority,
          due_date: updatedTask.due_date,
          workspace_id: updatedTask.workspace_id,
          assigned_to: updatedTask.assigned_to,
          progress: updatedTask.progress,
          comments: updatedTask.comments,
          reactions: updatedTask.reactions,
        })
        .eq("id", id)
        .select()
        .single();
      if (data) return data;
      // Ignore error and fall through to local storage
    }

    if (typeof window !== "undefined") {
      all[idx] = updatedTask;
      localStorage.setItem("tf_tasks", JSON.stringify(all));
    }
    return updatedTask;
  },

  async deleteTask(id: string): Promise<boolean> {
    initLocalStorage();
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) console.warn("Supabase delete failed, falling back to local:", error);
    }
    if (typeof window !== "undefined") {
      const all = await this.getAllTasks();
      const filtered = all.filter((t) => t.id !== id);
      localStorage.setItem("tf_tasks", JSON.stringify(filtered));
    }
    return true;
  },

  // --- Habits CRUD ---
  async getHabits(): Promise<Habit[]> {
    initLocalStorage();
    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      const { data, error } = await supabase.from("habits").select("*");
      if (!error && data) return data;
    }
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("tf_habits") || "[]");
    }
    return DEFAULT_HABITS;
  },

  async toggleHabit(id: string, dateStr: string): Promise<Habit[]> {
    initLocalStorage();
    const habits = await this.getHabits();
    const idx = habits.findIndex((h) => h.id === id);
    if (idx === -1) return habits;

    const habit = habits[idx];
    const dateIdx = habit.completed_days.indexOf(dateStr);
    let updatedCompleted: string[] = [];

    if (dateIdx > -1) {
      // Remove date (untoggle)
      updatedCompleted = habit.completed_days.filter((d) => d !== dateStr);
    } else {
      // Add date (toggle)
      updatedCompleted = [...habit.completed_days, dateStr];
    }

    const updatedHabit = { ...habit, completed_days: updatedCompleted };

    if (isSupabaseConfigured && supabase && !isGuestModeActive()) {
      await supabase
        .from("habits")
        .update({ completed_days: updatedCompleted })
        .eq("id", id);
    }

    if (typeof window !== "undefined") {
      habits[idx] = updatedHabit;
      localStorage.setItem("tf_habits", JSON.stringify(habits));
    }

    return habits;
  },

  // --- Self-care Streak ---
  async getSelfCareStreak(): Promise<number> {
    initLocalStorage();
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("tf_selfcare_streak") || "0", 10);
    }
    return 0;
  },

  async incrementStreak(): Promise<number> {
    initLocalStorage();
    const current = await this.getSelfCareStreak();
    const updated = current + 1;
    if (typeof window !== "undefined") {
      localStorage.setItem("tf_selfcare_streak", updated.toString());
    }
    return updated;
  }
};
