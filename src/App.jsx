import { useState, useEffect, useCallback } from "react";
import { ListTodo, BarChart3, Trash2 } from "lucide-react";
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

  // Check for expired tasks periodically but without notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      let hasChanges = false;

      const updatedTasks = tasks.map((task) => {
        const taskTime = new Date(task.time).getTime();
        
        // Auto-complete expired tasks
        if (!task.done && now >= taskTime) {
          hasChanges = true;
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
          return { ...task, done: true };
        }

        return task;
      });

      if (hasChanges) {
        setTasks(updatedTasks);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [tasks]);

  // Add task
  const addTask = useCallback((text, time, priority) => {
    const newTask = {
      id: Date.now(),
      text,
      time,
      priority: priority || "medium",
      done: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);

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

  return (
    <div className="app">
      <header className="header glass-card">
        <div className="logo-section">
          <div className="bell-icon">
            <ListTodo size={24} fill="currentColor" />
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
          Your Tasks
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
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
