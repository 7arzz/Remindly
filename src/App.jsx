import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, BarChart3, Settings, Zap, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import FilterControls from "./components/FilterControls";
import ProgressBar from "./components/ProgressBar";
import StatsDrawer from "./components/StatsDrawer";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import "./App.css";

function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("remindly_tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [filter, setFilter] = useState(
    () => localStorage.getItem("remindly_filter") || "all",
  );
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem("remindly_sortBy") || "time",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [soundType, setSoundType] = useState(
    () => localStorage.getItem("remindly_soundType") || "ping",
  );
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("remindly_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("remindly_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("remindly_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("remindly_filter", filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem("remindly_sortBy", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("remindly_soundType", soundType);
  }, [soundType]);
  const audioContext = useRef(null);

  const playSound = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }
    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Different sound patterns based on soundType
    if (soundType === "ping") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    } else if (soundType === "digital") {
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.8);
    }

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, [soundType]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Check reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      let hasChanges = false;

      const updatedTasks = tasks.map((task) => {
        const taskTime = new Date(task.time).getTime();
        const reminderTime = taskTime - (task.reminderMinutes || 0) * 60 * 1000;
        let newTask = { ...task };

        // 1. Check for early reminder
        if (
          !task.done &&
          !task.reminderSent &&
          task.reminderMinutes > 0 &&
          now >= reminderTime &&
          now < taskTime
        ) {
          if (Notification.permission === "granted") {
            new Notification("🔔 Reminder: Remindly", {
              body: `Upcoming: ${task.text} (in ${task.reminderMinutes} mins)`,
              icon: "/vite.svg",
            });
          }

          playSound();
          newTask.reminderSent = true;
          hasChanges = true;
        }

        // 2. Check for deadline
        if (!task.done && !task.notified && now >= taskTime) {
          if (Notification.permission === "granted") {
            new Notification("⏰ Remindly: Deadline Reach!", {
              body: task.text,
              icon: "/vite.svg",
            });
            newTask.notified = true;
          }

          playSound();

          setHistory((prev) =>
            [
              {
                id: Date.now(),
                text: task.text,
                time: new Date().toISOString(),
                priority: task.priority,
              },
              ...prev,
            ].slice(0, 50),
          );

          hasChanges = true;
          newTask.done = true;
        }

        return newTask;
      });

      if (hasChanges) {
        setTasks(updatedTasks);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks, playSound]);

  // Add task
  const addTask = useCallback((text, time, priority, reminderMinutes) => {
    const newTask = {
      id: Date.now(),
      text,
      time,
      priority: priority || "medium",
      reminderMinutes: reminderMinutes || 0,
      reminderSent: false,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);

    // Add some visual flair when adding
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#a855f7", "#7c3aed", "#ffffff"],
    });
  }, []);

  // Delete task
  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const updateTask = useCallback((id, updates) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    );
  }, []);

  // Toggle Done
  const toggleDone = useCallback((id) => {
    let isNowDone = false;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          isNowDone = !task.done;
          return { ...task, done: isNowDone };
        }
        return task;
      }),
    );

    if (isNowDone) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, []);

  const clearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all tasks?")) {
      setTasks([]);
    }
  }, []);

  const testNotification = useCallback(() => {
    if (Notification.permission === "granted") {
      new Notification("🔔 Test Notification", {
        body: "This is a test reminder from Remindly!",
        icon: "/vite.svg",
      });
    }
    playSound();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, [playSound]);

  return (
    <div className="app">
      <header className="header glass-card">
        <div className="logo-section">
          <div className="bell-icon">
            <Bell size={24} fill="currentColor" />
          </div>
          <h1>Remindly</h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="icon-btn"
            onClick={() => setIsStatsOpen(true)}
            title="Statistics"
          >
            <BarChart3 size={20} />
          </button>
          <div className="sound-selector">
            <Settings size={18} style={{ opacity: 0.6 }} />
            <select
              value={soundType}
              onChange={(e) => setSoundType(e.target.value)}
              className="mini-select"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
              }}
            >
              <option value="ping">Ping</option>
              <option value="digital">Digital</option>
              <option value="alert">Alert</option>
            </select>
          </div>
        </div>
      </header>

      <ProgressBar tasks={tasks} />

      <div className="glass-card">
        <TaskInput addTask={addTask} />
      </div>

      <FilterControls
        filter={filter}
        setFilter={setFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 8px",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>
          Your Reminders
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="icon-btn"
            onClick={testNotification}
            title="Test Notification"
          >
            <Zap size={20} />
          </button>
          <button
            className="icon-btn delete"
            onClick={clearAll}
            title="Clear All"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <TaskList
        tasks={tasks}
        deleteTask={deleteTask}
        toggleDone={toggleDone}
        updateTask={updateTask}
        filter={filter}
        sortBy={sortBy}
        searchQuery={searchQuery}
      />

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tasks={tasks}
        history={history}
      />
    </div>
  );
}

export default App;
