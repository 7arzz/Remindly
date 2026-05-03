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
// import "./App.css";

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
    if (!user) return false;
    
    try {
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

      await addDoc(collection(db, "tasks"), newTask);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#64ffda", "#00bcd4", "#ffffff"],
      });
      return true;
    } catch (error) {
      console.error("Error adding task: ", error);
      alert("Failed to add task. Please check your connection.");
      return false;
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
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary z-50">
        <div className="w-12 h-12 border-4 border-bg-secondary border-t-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-sea">
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
            <p className="text-text-secondary">Organize your tasks and summaries in a premium, <b className="text-accent-primary">collaborative</b> Sea Space.</p>
          </div>
          <button 
            className="btn-primary w-full shadow-xl shadow-accent-primary/10" 
            onClick={handleLogin}
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6 sm:gap-8 min-h-screen">
      <header className="glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 sm:p-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-accent-primary p-3 rounded-xl shadow-lg shadow-accent-primary/20 shrink-0">
            <ListTodo size={24} className="text-bg-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-accent-primary m-0 mb-0">
                Remindly
              </h1>
              <span className="hidden xs:flex items-center gap-1.5 bg-accent-primary/10 text-accent-primary text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold border border-accent-primary/20 uppercase tracking-wider">
                <Globe size={12}/> Sea Space
              </span>
            </div>
            <span className="text-text-muted text-xs sm:text-sm font-medium">{user.email}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <button
            className="icon-btn bg-bg-secondary/50 hover:bg-bg-secondary border border-border-primary/50"
            onClick={() => setIsStatsOpen(true)}
            title="Statistics"
          >
            <BarChart3 size={20} />
          </button>
          <button
            className="icon-btn bg-bg-secondary/50 hover:bg-red-500/10 hover:text-red-400 border border-border-primary/50"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <nav className="flex bg-bg-secondary/50 p-1.5 rounded-2xl border border-border-primary/30 gap-2">
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
            activeTab === "tasks" 
            ? "bg-bg-card text-accent-primary shadow-lg border border-border-primary" 
            : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
          onClick={() => setActiveTab("tasks")}
        >
          <CheckCircle2 size={18} />
          <span className="text-sm sm:text-base">Tasks</span>
        </button>
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
            activeTab === "summaries" 
            ? "bg-bg-card text-accent-primary shadow-lg border border-border-primary" 
            : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
          onClick={() => setActiveTab("summaries")}
        >
          <FileText size={18} />
          <span className="text-sm sm:text-base">Summaries</span>
        </button>
      </nav>

      {activeTab === "tasks" ? (
        <div className="flex flex-col gap-6 sm:gap-8 fadeIn">
          <ProgressBar tasks={tasks} />

          <div className="glass-card overflow-hidden">
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

          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Community Tasks</h2>
            <button 
              className="icon-btn text-text-muted hover:text-red-400 hover:bg-red-500/10" 
              onClick={clearAll} 
              title="Clear All"
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
      ) : (
        <div className="fadeIn">
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
          onDelete={() => {
            deleteTask(selectedTaskId);
            setSelectedTaskId(null);
          }}
          updateTask={updateTask}
          currentUser={user}
        />
      )}
    </div>
  );
}

export default App;
