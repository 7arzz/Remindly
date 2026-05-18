import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Trash2,
  ListTodo,
  LogIn,
  LogOut,
  Globe,
  FileText,
  CheckCircle2,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import FilterControls from "./components/FilterControls";
import ProgressBar from "./components/ProgressBar";
import StatsDrawer from "./components/StatsDrawer";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import TaskModal from "./components/TaskModal";
import Detail from "./components/Detail";
import SummarySection from "./components/SummarySection";
import AddRoadmap from "./components/AddRoadmap";
import RoadmapCard from "./components/RoadmapCard";
import NotificationPermissionBanner from "./components/NotificationPermissionBanner";
import SpotlightTutorial from "./components/SpotlightTutorial";
import { useTutorial } from "./hooks/useTutorial";
import { supabase, loginWithGoogle, logout } from "./supabase";
import { toast } from "sonner";
import { useNotifications } from "./hooks/useNotifications";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeTab, setActiveTab] = useState("tasks"); // "tasks", "summaries", or "roadmap"
  const [filter, setFilter] = useState(
    () => localStorage.getItem("remindly_filter") || "all",
  );
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem("remindly_sortBy") || "time",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showDebug, setShowDebug] = useState(false);

  // Spotlight Tutorial Configuration
  const tutorialSteps = [
    {
      targetId: "nav-tasks",
      title: "Daftar Tugas Premium",
      description:
        "Kelola daftar tugas harian Anda di sini. Dilengkapi sinkronisasi real-time dengan Supabase database.",
      position: "right",
    },
    {
      targetId: "task-input-container",
      title: "Tambah Tugas Baru",
      description:
        "Gunakan form ini untuk membuat tugas baru. Masukkan detail tugas, tentukan prioritas, atur deadline, unggah gambar pendukung, dan setel AI reminder offset.",
      position: "bottom",
    },
    {
      targetId: "progress-bar-container",
      title: "Progress Tracker",
      description:
        "Pantau kemajuan Anda secara visual. Progress bar ini akan terisi otomatis saat Anda menandai tugas sebagai selesai.",
      position: "bottom",
    },
    {
      targetId: "nav-summaries",
      title: "Knowledge Hub",
      description:
        "Punya foto catatan, dokumen tugas, atau papan tulis? Unggah di sini dan biarkan Gemini AI merangkum isi foto tersebut menjadi catatan digital secara cerdas.",
      position: "right",
    },
    {
      targetId: "summary-section",
      title: "Ringkasan AI",
      description:
        "Lihat semua rangkasan dan catatan Anda yang dihasilkan AI pada panel ini. Anda dapat menambah, mengedit, atau menghapus rangkasan.",
      position: "right",
    },
    {
      targetId: window.innerWidth < 768 ? "mobile-nav-stats-hint" : "btn-stats",
      title: "Analitik & Grafik AI",
      description:
        "Analisis performa penyelesaian tugas Anda lewat visualisasi statistik interaktif di panel ini.",
      position: "bottom",
      onEnter: () => setIsMenuOpen(true),
      onLeave: () => setIsMenuOpen(false),
    },
    {
      targetId: "roadmap-section",
      title: "Roadmap Strategis",
      description:
        "Kelola rencana jangka panjang Anda dengan menambahkan, mengedit, dan menandai langkah-langkah penting.",
      position: "right",
    },
  ];

  const {
    isActive: isTutorialActive,
    currentStep: tutorialCurrentStep,
    totalSteps: tutorialTotalSteps,
    goNext: tutorialGoNext,
    goPrev: tutorialGoPrev,
    skip: tutorialSkip,
    restart: restartTutorial,
  } = useTutorial(tutorialSteps);

  // Tab auto-switching logic during tutorial to keep targeted elements on screen
  useEffect(() => {
    if (!isTutorialActive) return;
    if (tutorialCurrentStep === 3) {
      setActiveTab("summaries");
    } else if (tutorialCurrentStep === 6) {
      setActiveTab("roadmap");
    } else if (tutorialCurrentStep <= 2) {
      setActiveTab("tasks");
    }
  }, [tutorialCurrentStep, isTutorialActive]);

  // Auth Listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prevent accidental close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; // Standard for most browsers
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ─── Push Notification hook ─────────────────────────────────────────────
  const {
    permission: notifPermission,
    tokenLoading,
    tokenError,
    support: notifSupport,
    // eslint-disable-next-line no-unused-vars
    debugLog,
    fcmToken,
    requestPermission: requestNotifPermission,
  } = useNotifications(user, tasks);

  // Supabase Sync - Real-time Tasks
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    // Initial fetch
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching tasks:", error);
      else setTasks(data || []);
    };

    fetchTasks();

    // Subscribe to changes
    const channel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t)),
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Supabase Sync - Real-time Roadmaps
  useEffect(() => {
    if (!user) {
      setRoadmaps([]);
      return;
    }

    const fetchRoadmaps = async () => {
      const { data, error } = await supabase
        .from("roadmaps")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching roadmaps:", error);
      else setRoadmaps(data || []);
    };

    fetchRoadmaps();

    const channel = supabase
      .channel("roadmaps_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roadmaps" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRoadmaps((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setRoadmaps((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r)),
            );
          } else if (payload.eventType === "DELETE") {
            setRoadmaps((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem("remindly_filter", filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem("remindly_sortBy", sortBy);
  }, [sortBy]);

  // Add task
  const addTask = useCallback(
    async (text, time, priority, detail, imageUrl, reminderOffset) => {
      if (!user) return false;

      try {
        const newTask = {
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email.split("@")[0],
          user_email: user.email,
          text,
          time,
          priority: priority || "medium",
          detail: detail || "",
          done: false,
          image_url: imageUrl || null,
          reminder_offset: reminderOffset || 0,
        };

        const { error } = await supabase.from("tasks").insert([newTask]);

        if (error) throw error;

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#64ffda", "#00bcd4", "#ffffff"],
        });
        return true;
      } catch (error) {
        console.error("Error adding task: ", error);
        toast.error("Failed to add task. Please check your connection.");
        return false;
      }
    },
    [user],
  );

  // Delete task
  const deleteTask = useCallback(
    async (id) => {
      if (!user) return;
      try {
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) throw error;
      } catch (error) {
        console.error("Error deleting task: ", error);
      }
    },
    [user],
  );

  const updateTask = useCallback(
    async (id, updates) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
      } catch (error) {
        console.error("Error updating task: ", error);
      }
    },
    [user],
  );

  // Toggle Done
  const toggleDone = useCallback(
    async (id) => {
      if (!user) return;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const isNowDone = !task.done;
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ done: isNowDone })
          .eq("id", id);

        if (error) throw error;

        if (isNowDone) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#64ffda", "#00bcd4", "#ffffff"],
          });
        }
      } catch (error) {
        console.error("Error toggling task: ", error);
      }
    },
    [user, tasks],
  );

  // Roadmap Actions
  const addRoadmap = async (title, steps = []) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("roadmaps").insert([
        {
          title,
          user_id: user.id,
          steps: steps,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      toast.success("Roadmap created successfully!");
    } catch (error) {
      console.error("Error adding roadmap:", error);
      toast.error("Failed to create roadmap.");
    }
  };

  const deleteRoadmap = async (id) => {
    if (!user) return;

    toast("Delete Roadmap?", {
      description:
        "Are you sure you want to delete this roadmap? This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from("roadmaps")
              .delete()
              .eq("id", id);
            if (error) throw error;
            toast.success("Roadmap deleted.");
          } catch (error) {
            console.error("Error deleting roadmap:", error);
            toast.error("Failed to delete roadmap.");
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  };

  const editRoadmap = async (id, title) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("roadmaps")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
      toast.success("Roadmap title updated.");
    } catch (error) {
      console.error("Error editing roadmap:", error);
      toast.error("Failed to update roadmap title.");
    }
  };

  const addStep = async (roadmapId, stepText) => {
    if (!user) return;
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return;

    const newStep = {
      id: crypto.randomUUID(),
      text: stepText,
      done: false,
    };

    try {
      const { error } = await supabase
        .from("roadmaps")
        .update({ steps: [...roadmap.steps, newStep] })
        .eq("id", roadmapId);
      if (error) throw error;
      toast.success("Step added!");
    } catch (error) {
      console.error("Error adding step:", error);
      toast.error("Failed to add step.");
    }
  };

  const toggleStep = async (roadmapId, stepId) => {
    if (!user) return;
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return;

    const updatedSteps = roadmap.steps.map((s) =>
      s.id === stepId ? { ...s, done: !s.done } : s,
    );

    try {
      const { error } = await supabase
        .from("roadmaps")
        .update({ steps: updatedSteps })
        .eq("id", roadmapId);
      if (error) throw error;

      const isNowDone = updatedSteps.find((s) => s.id === stepId).done;
      if (isNowDone) {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: ["#64ffda", "#00bcd4"],
        });
      }
    } catch (error) {
      console.error("Error toggling step:", error);
    }
  };

  const updateStep = async (roadmapId, stepId, updates) => {
    if (!user) return;
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return;

    const updatedSteps = roadmap.steps.map((s) =>
      s.id === stepId ? { ...s, ...updates } : s,
    );

    try {
      const { error } = await supabase
        .from("roadmaps")
        .update({ steps: updatedSteps })
        .eq("id", roadmapId);
      if (error) throw error;
      toast.success("Step updated!");
    } catch (error) {
      console.error("Error updating step:", error);
      toast.error("Failed to update step.");
    }
  };

  const deleteStep = async (roadmapId, stepId) => {
    if (!user) return;
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return;

    const updatedSteps = roadmap.steps.filter((s) => s.id !== stepId);

    try {
      const { error } = await supabase
        .from("roadmaps")
        .update({ steps: updatedSteps })
        .eq("id", roadmapId);
      if (error) throw error;
      toast.success("Step deleted.");
    } catch (error) {
      console.error("Error deleting step:", error);
      toast.error("Failed to delete step.");
    }
  };

  const reorderStep = async (roadmapId, fromIdx, toIdx) => {
    if (!user) return;
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return;

    const updatedSteps = [...roadmap.steps];
    const [moved] = updatedSteps.splice(fromIdx, 1);
    updatedSteps.splice(toIdx, 0, moved);

    try {
      const { error } = await supabase
        .from("roadmaps")
        .update({ steps: updatedSteps })
        .eq("id", roadmapId);
      if (error) throw error;
    } catch (error) {
      console.error("Error reordering steps:", error);
    }
  };

  const clearAll = useCallback(async () => {
    if (!user) return;

    toast("Clear All Tasks?", {
      description:
        "Are you sure you want to clear ALL PUBLIC tasks? This cannot be undone.",
      action: {
        label: "Clear All",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from("tasks")
              .delete()
              .not("id", "is", null); // Delete all
            if (error) throw error;
            toast.success("All public tasks cleared.");
          } catch (error) {
            console.error("Error clearing tasks: ", error);
            toast.error("Failed to clear tasks.");
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`Login failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary z-50">
        <div className="w-12 h-12 border-4 border-bg-secondary border-t-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-sea relative">
        <div className="absolute top-5 right-5 z-[100]">
          <ThemeToggle />
        </div>
        <header className="w-full max-w-md mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-accent-primary p-4 rounded-2xl shadow-lg shadow-accent-primary/20">
              <ListTodo size={40} className="text-bg-primary" />
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-accent-primary tracking-tight">
              Remindly
            </h1>
          </div>
        </header>
        <div className="glass-card w-full max-w-md p-10 text-center flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-3">Welcome to Remindly</h2>
            <p className="text-text-secondary">
              Organize your tasks and summaries in a premium,{" "}
              <b className="text-accent-primary">collaborative</b> Sea Space.
            </p>
          </div>
          <button
            className="btn-primary w-full shadow-xl shadow-accent-primary/10"
            onClick={handleLogin}
          >
            <LogIn size={20} />
            Sign in with Google
          </button>

          <button
            onClick={async () => {
              console.log(
                "[Test] Test Notification button clicked (unauthenticated)",
              );
              console.log(
                "[Test] Notification.permission:",
                Notification.permission,
              );
              console.log(
                "[Test] serviceWorker in navigator:",
                "serviceWorker" in navigator,
              );

              if ("serviceWorker" in navigator) {
                const reg = await navigator.serviceWorker.getRegistration();
                console.log("[Test] serviceWorker registration:", reg);
                if (reg) {
                  console.log("[Test] active SW state:", reg?.active?.state);
                } else {
                  console.log(
                    "[Test] No SW registered yet, registering now...",
                  );
                  try {
                    const { registerServiceWorker } =
                      await import("./lib/firebase.js");
                    const newReg = await registerServiceWorker();
                    console.log("[Test] Newly registered SW:", newReg);
                  } catch (err) {
                    console.error("[Test] SW register failed:", err);
                  }
                }
              }

              const { checkBrowserSupport } = await import("./lib/firebase.js");
              console.log("[Test] browser support:", checkBrowserSupport());

              if (Notification.permission === "default") {
                console.log("[Test] Requesting permission...");
                await Notification.requestPermission();
              }

              const { sendLocalNotification } =
                await import("./lib/firebase.js");
              sendLocalNotification(
                "Test Notification",
                "This is a test notification from the login button click.",
              );
            }}
            className="text-xs text-text-muted hover:text-accent-primary transition-colors underline cursor-pointer"
          >
            Test Notification (Unauthenticated)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar (Desktop) */}
      <aside className="sidebar">
        <div className="flex items-center gap-4 mb-10 px-2">
          <div className="bg-accent-primary p-3 rounded-xl shadow-lg shadow-accent-primary/20">
            <ListTodo size={24} className="text-bg-primary" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-accent-primary">
            Remindly
          </h1>
        </div>

        <nav className="flex flex-col gap-3">
          <button
            id="nav-tasks"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
              activeTab === "tasks"
                ? "bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/10"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            }`}
          >
            <CheckCircle2 size={20} />
            <span>Tasks</span>
          </button>
          <button
            id="nav-summaries"
            onClick={() => setActiveTab("summaries")}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
              activeTab === "summaries"
                ? "bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/10"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            }`}
          >
            <FileText size={20} />
            <span>Summaries</span>
          </button>
          <button
            id="nav-roadmap"
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
              activeTab === "roadmap"
                ? "bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/10"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            }`}
          >
            <Globe size={20} />
            <span>Roadmap</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4 border-t border-border-primary/50 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-bg-card border border-border-primary flex items-center justify-center text-accent-primary font-black">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-text-primary truncate">
                {user.user_metadata?.full_name || user.email.split("@")[0]}
              </span>
              <span className="text-[10px] text-text-muted truncate">
                {user.email}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-5 py-3 text-text-muted hover:text-rose-400 transition-colors font-bold text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          <button
            onClick={() => setShowDebug(true)}
            className="text-xs text-text-muted/50 hover:text-text-primary px-5 pb-2 text-left"
          >
            Debug FCM
          </button>

          <button
            onClick={async () => {
              try {
                if (!fcmToken) {
                  toast.error(
                    "FCM token not ready yet. Enable notifications first.",
                  );
                  return;
                }

                const supabaseUrl = "https://wdydmrdcxuhtcqqckcmq.supabase.co";
                const endpoint = `${supabaseUrl}/functions/v1/send-test-fcm`;

                toast.loading("Sending Test FCM…", { id: "send-test-fcm" });

                const res = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: fcmToken,
                    title: "⏰ Remindly FCM Test",
                    body: "FCM test message (foreground/background reliability check).",
                    url: "/",
                    tag: `remindly-test:${Date.now()}`,
                    task_id: "manual-test",
                  }),
                });

                const text = await res.text();
                let json = null;
                try {
                  json = JSON.parse(text);
                } catch {
                  json = { raw: text };
                }

                console.log("[Test FCM] response:", {
                  status: res.status,
                  json,
                });

                if (!res.ok || json?.ok === false) {
                  toast.error("FCM test failed. Check console for details.", {
                    id: "send-test-fcm",
                  });
                  return;
                }

                toast.success("FCM test push sent.", { id: "send-test-fcm" });
              } catch (err) {
                console.error("[Test FCM] error:", err);
                toast.error("FCM test error. Check console.", {
                  id: "send-test-fcm",
                });
              }
            }}
            className="text-xs text-text-muted/50 hover:text-text-primary px-5 pb-4 text-left"
          >
            Send Test FCM
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="h-20 border-b border-border-primary/30 flex items-center justify-between px-5 sm:px-10 bg-bg-primary/50 backdrop-blur-md z-40 relative">
          {/* Mobile: Logo */}
          <div className="lg:hidden flex items-center gap-3">
            <ListTodo size={24} className="text-accent-primary" />
            <span className="font-black text-lg tracking-tight">Remindly</span>
          </div>

          {/* Desktop: page label */}
          <div className="hidden lg:block">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">
              {activeTab === "tasks"
                ? "Managing Tasks"
                : activeTab === "summaries"
                  ? "Knowledge Hub"
                  : "Strategic Roadmap"}
            </span>
          </div>

          {/* Desktop buttons (always visible on lg+) */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <button
              title="Mulai Ulang Tutorial"
              className="p-3 rounded-xl bg-bg-secondary/50 text-text-secondary hover:text-accent-primary transition-all border border-border-primary/30 flex items-center justify-center"
              onClick={restartTutorial}
            >
              <HelpCircle size={20} />
            </button>
            <button
              id="btn-stats"
              className="p-3 rounded-xl bg-bg-secondary/50 text-text-secondary hover:text-accent-primary transition-all border border-border-primary/30"
              onClick={() => setIsStatsOpen(true)}
            >
              <BarChart3 size={20} />
            </button>
          </div>

          {/* Mobile fallback target for tutorial */}
          <span
            id="mobile-nav-stats-hint"
            className="lg:hidden absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 pointer-events-none opacity-0"
          />

          {/* Mobile: Hamburger button */}
          <button
            className="lg:hidden p-2.5 rounded-xl bg-bg-secondary/60 border border-border-primary/40 text-text-secondary hover:text-accent-primary hover:border-accent-primary/30 transition-all"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Mobile Hamburger Dropdown */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[200]"
                onClick={() => setIsMenuOpen(false)}
              />
              {/* Menu sheet */}
              <div className="mobile-hamburger-menu">
                {/* User info */}
                <div className="flex items-center gap-3 px-1 pb-3 mb-1 border-b border-border-primary/40">
                  <div className="w-9 h-9 rounded-full bg-bg-card border border-border-primary flex items-center justify-center text-accent-primary font-black text-sm flex-shrink-0">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-text-primary truncate">
                      {user.user_metadata?.full_name ||
                        user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-text-muted truncate">
                      {user.email}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="mobile-menu-item flex justify-between items-center px-4 py-2 border-b border-border-primary/20">
                  <span className="text-sm font-bold text-text-secondary">
                    Switch Theme
                  </span>
                  <ThemeToggle />
                </div>
                <button
                  className="mobile-menu-item"
                  onClick={() => {
                    restartTutorial();
                    setIsMenuOpen(false);
                  }}
                >
                  <HelpCircle size={18} />
                  <span>Guided Tour</span>
                </button>
                <button
                  id="btn-stats"
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsStatsOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  <BarChart3 size={18} />
                  <span>Analytics</span>
                </button>
                <button
                  className="mobile-menu-item"
                  onClick={() => {
                    setShowDebug(true);
                    setIsMenuOpen(false);
                  }}
                >
                  <ListTodo size={18} />
                  <span>Debug FCM</span>
                </button>
                <button
                  className="mobile-menu-item mobile-menu-item--danger"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </header>

        {/* Notification Permission Banner */}
        <NotificationPermissionBanner
          permission={notifPermission}
          tokenLoading={tokenLoading}
          tokenError={tokenError}
          supported={notifSupport.fcm}
          onEnable={requestNotifPermission}
        />

        {/* Scrollable Content */}
        <div className="scroll-area no-scrollbar">
          <div className="max-w-5xl mx-auto w-full">
            {activeTab === "tasks" ? (
              <div className="flex flex-col gap-6 sm:gap-10 fadeIn">
                <div id="progress-bar-container">
                  <ProgressBar tasks={tasks} />
                </div>
                <div
                  id="task-input-container"
                  className="glass-card overflow-hidden"
                >
                  <TaskInput addTask={addTask} />
                </div>
                <div id="filter-controls-container">
                  <FilterControls
                    filter={filter}
                    setFilter={setFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </div>
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-2xl font-black text-text-primary tracking-tight">
                    Tasks
                  </h2>
                  <button
                    className="icon-btn text-text-muted hover:text-red-400"
                    onClick={clearAll}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <TaskList
                  tasks={tasks}
                  deleteTask={deleteTask}
                  toggleDone={toggleDone}
                  updateTask={updateTask}
                  filter={filter}
                  sortBy={sortBy}
                  searchQuery={searchQuery}
                  currentUser={user}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                />
              </div>
            ) : activeTab === "summaries" ? (
              <div id="summary-section" className="fadeIn">
                <SummarySection currentUser={user} />
              </div>
            ) : (
              <div id="roadmap-section" className="roadmap-container fadeIn">
                <div className="roadmap-header-content">
                  <div>
                    <h2 className="text-3xl font-black text-text-primary tracking-tight">
                      Goal Roadmap
                    </h2>
                    <p className="text-text-secondary text-sm">
                      Plan your long-term success with AI steps.
                    </p>
                  </div>
                  <AddRoadmap onAdd={addRoadmap} />
                </div>

                <div className="flex flex-col gap-8">
                  {roadmaps.length === 0 ? (
                    <div className="glass-card p-16 text-center flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center text-text-muted">
                        <Globe size={40} />
                      </div>
                      <h3 className="text-xl font-bold">No roadmaps yet</h3>
                    </div>
                  ) : (
                    roadmaps.map((roadmap, idx) => (
                      <RoadmapCard
                        key={roadmap.id}
                        roadmap={roadmap}
                        index={idx}
                        total={roadmaps.length}
                        onDeleteRoadmap={deleteRoadmap}
                        onEditRoadmap={editRoadmap}
                        onAddStep={addStep}
                        onToggleStep={toggleStep}
                        onDeleteStep={deleteStep}
                        onUpdateStep={updateStep}
                        onReorderStep={reorderStep}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="mobile-nav">
          <button
            id="mobile-nav-tasks"
            onClick={() => setActiveTab("tasks")}
            className={`nav-item-mobile ${activeTab === "tasks" ? "active" : ""}`}
          >
            <CheckCircle2 size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Tasks
            </span>
          </button>
          <button
            id="mobile-nav-summaries"
            onClick={() => setActiveTab("summaries")}
            className={`nav-item-mobile ${activeTab === "summaries" ? "active" : ""}`}
          >
            <FileText size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Knowledge
            </span>
          </button>
          <button
            id="mobile-nav-roadmap"
            onClick={() => setActiveTab("roadmap")}
            className={`nav-item-mobile ${activeTab === "roadmap" ? "active" : ""}`}
          >
            <Globe size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Roadmap
            </span>
          </button>
        </nav>
      </main>

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tasks={tasks}
        history={[]}
      />

      <AnimatePresence>
        {selectedTaskId && (
          <TaskModal
            task={tasks.find((t) => String(t.id) === String(selectedTaskId))}
            isOpen={true}
            onClose={() => setSelectedTaskId(null)}
            onDelete={deleteTask}
            toggleDone={toggleDone}
            onUpdate={updateTask}
            currentUser={user}
          />
        )}
      </AnimatePresence>

      {/* Spotlight / Focus Tutorial */}
      <SpotlightTutorial
        steps={tutorialSteps}
        isActive={isTutorialActive}
        currentStep={tutorialCurrentStep}
        totalSteps={tutorialTotalSteps}
        onNext={tutorialGoNext}
        onPrev={tutorialGoPrev}
        onSkip={tutorialSkip}
      />
    </div>
  );
}

export default App;
