import { AnimatePresence, motion as Motion } from "framer-motion";

import TaskCard from "./TaskCard";

function TaskList({ tasks, deleteTask, toggleDone, updateTask, filter, sortBy, searchQuery, onTaskClick }) {
  // 1. Filter
  const filteredTasks = tasks.filter(task => {
    // Status filter
    if (filter === 'active' && task.done) return false;
    if (filter === 'done' && !task.done) return false;
    
    // Search filter
    if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  // 2. Sort
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityWeights = { high: 3, medium: 2, low: 1 };
      // Sort priority descending (High to Low), then by time
      if (priorityWeights[b.priority] !== priorityWeights[a.priority]) {
        return priorityWeights[b.priority] - priorityWeights[a.priority];
      }
    }
    // Default or secondary sort by time ASC
    return new Date(a.time) - new Date(b.time);
  });

  if (tasks.length === 0) {
    return (
      <Motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
      >
        <p>No reminders yet. Add one above! ✨</p>
      </Motion.div>

    )
  }

  return (
    <div className="task-list">
      <AnimatePresence mode="popLayout">
        {sortedTasks.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            deleteTask={deleteTask} 
            toggleDone={toggleDone}
            updateTask={updateTask}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default TaskList;
