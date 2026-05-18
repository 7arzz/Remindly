import { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Custom tooltip for chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.name === 'Start') return null;
    return (
      <div className="bg-bg-card border border-border-primary p-3 rounded-xl shadow-xl z-50">
        <p className="text-xs font-bold text-text-primary mb-1">{data.taskName}</p>
        <p className={`text-[10px] font-black uppercase tracking-widest ${data.status === 'Selesai' ? 'text-accent-primary' : 'text-rose-500'}`}>
          {data.status} (Score: {data.score})
        </p>
      </div>
    );
  }
  return null;
};

function StatsDrawer({ isOpen, onClose, tasks, history }) {
  const completedToday = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Calculate chart data: naik jika selesai, turun jika tidak selesai
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let currentScore = 0;
  const chartData = [{ name: 'Start', score: 0 }];
  
  sortedTasks.forEach((task, index) => {
    if (task.done) {
      currentScore += 1;
    } else {
      currentScore -= 1;
    }
    
    // Format tanggal untuk sumbu X (misal: "17 Mei")
    const dateLabel = new Date(task.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });

    chartData.push({
      name: dateLabel,
      score: currentScore,
      taskName: task.text,
      status: task.done ? 'Selesai' : 'Belum Selesai'
    });
  });

  // Dynamic Theme Colors for Recharts
  const gridColor = isDark ? "#233554" : "#e2eaf4";
  const axisColor = isDark ? "#8892b0" : "#475569";
  const lineColor = isDark ? "#64ffda" : "#2563eb";
  const dotFill = isDark ? "#112240" : "#ffffff";
  const dotStroke = isDark ? "#64ffda" : "#2563eb";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />
          <Motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-bg-card border-l border-border-primary p-8 z-[151] flex flex-col gap-8 shadow-2xl"
          >
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-primary/10 rounded-lg text-accent-primary">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Statistics</h3>
              </div>
              <button 
                className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90" 
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-secondary/50 border border-border-primary/50 p-5 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Total Reminders</span>
                <span className="text-3xl font-black text-text-primary">{totalTasks}</span>
              </div>
              <div className="bg-bg-secondary/50 border border-border-primary/50 p-5 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Completed Today</span>
                <span className="text-3xl font-black text-accent-primary">{completedToday}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center gap-2 px-1">
                <TrendingUp size={16} className="text-accent-primary/60" />
                <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary">Performance Graph</h4>
              </div>

              <div className="flex-1 w-full bg-bg-secondary/30 rounded-2xl p-4 border border-border-primary/50 flex flex-col justify-center min-h-[250px]">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 opacity-40 h-full">
                    <TrendingUp size={40} className="text-text-muted" />
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted text-center">Belum ada data tugas</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke={lineColor} 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: dotFill, stroke: dotStroke, strokeWidth: 2 }} 
                        activeDot={{ r: 6, fill: lineColor }}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default StatsDrawer;
