import { useState, useEffect, useCallback } from "react";
import { 
  BarChart3, Trash2, ListTodo, LogIn, LogOut, 
  User as UserIcon, Globe, FileText, CheckCircle2 
} from "lucide-react";
import confetti from "canvas-confetti";
import FilterControls from "./components/FilterControls";
import ProgressBar from "./components/ProgressBar";
import StatsDrawer from "./components/StatsDrawer";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import Detail from "./components/Detail";
import SummarySection from "./components/SummarySection";
import { auth, db, loginWithGoogle, logout } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDocs,
  writeBatch
} from "firebase/firestore";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("tasks"); // "tasks" or "summaries"
  const [filter, setFilter] = useState(
    () => localStorage.getItem("remindly_filter") || "all",
  );
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem("remindly_sortBy") || "time",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync - Public Mode
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(collection(db, "tasks"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskData);
    }, (error) => {
      console.error("Firestore Snapshot Error (Tasks):", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    localStorage.setItem("remindly_filter", filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem("remindly_sortBy", sortBy);
  }, [sortBy]);

  // Add task
  const addTask = useCallback(async (text, time, priority, detail) => {
    if (!user) return;
    
    const newTask = {
      userId: user.uid,
      userName: user.displayName || user.email.split('@')[0],
      userEmail: user.email,
      text,
      time,
      priority: priority || "medium",
      detail: detail || "",
      done: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "tasks"), newTask);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#64ffda", "#00bcd4", "#ffffff"],
      });
    } catch (error) {
      console.error("Error adding task: ", error);
    }
  }, [user]);

  // Delete task
  const deleteTask = useCallback(async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (error) {
      console.error("Error deleting task: ", error);
    }
  }, [user]);

  const updateTask = useCallback(async (id, updates) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "tasks", id), updates);
    } catch (error) {
      console.error("Error updating task: ", error);
    }
  }, [user]);

  // Toggle Done
  const toggleDone = useCallback(async (id) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isNowDone = !task.done;
    try {
      await updateDoc(doc(db, "tasks", id), { done: isNowDone });
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
  }, [user, tasks]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    if (window.confirm("Are you sure you want to clear ALL PUBLIC tasks?")) {
      try {
        const q = query(collection(db, "tasks"));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error clearing tasks: ", error);
      }
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      alert(`Login failed: ${error.message}\n\nMake sure Google Auth is enabled and domain is authorized.`);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app login-view">
        <header className="header glass-card">
          <div className="logo-section">
            <div className="bell-icon">
              <ListTodo size={24} />
            </div>
            <h1>Remindly</h1>
          </div>
        </header>
        <div className="glass-card welcome-card">
          <h2>Welcome to Remindly</h2>
          <p>Organize your tasks and summaries in a premium, <b>collaborative</b> Sea Space.</p>
          <button className="primary login-btn" onClick={handleLogin}>
            <LogIn size={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header glass-card">
        <div className="logo-section">
          <div className="bell-icon">
            <ListTodo size={24} />
          </div>
          <div className="user-info-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>Remindly</h1>
              <span className="badge-public"><Globe size={12}/> Sea Space</span>
            </div>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="icon-btn"
            onClick={() => setIsStatsOpen(true)}
            title="Statistics"
          >
            <BarChart3 size={20} />
          </button>
          <button
            className="icon-btn logout-btn"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <nav className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          <CheckCircle2 size={18} />
          Tasks
        </button>
        <button 
          className={`tab-btn ${activeTab === "summaries" ? "active" : ""}`}
          onClick={() => setActiveTab("summaries")}
        >
          <FileText size={18} />
          Summaries
        </button>
      </nav>

      {activeTab === "tasks" ? (
        <div className="tab-content fadeIn">
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

          <div className="section-header">
            <h2 className="section-title">Community Tasks</h2>
            <button className="icon-btn delete" onClick={clearAll} title="Clear All">
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
            onTaskClick={(task) => setSelectedTaskId(task.id)}
          />
        </div>
      ) : (
        <div className="tab-content fadeIn">
          <SummarySection currentUser={user} />
        </div>
      )}

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tasks={tasks}
        history={[]}
      />

      {selectedTaskId && (
        <Detail
          task={tasks.find((t) => t.id === selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          updateTask={updateTask}
          currentUser={user}
        />
      )}
    </div>
  );
}

export default App;
