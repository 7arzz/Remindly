import { SortAsc, CheckCircle2, Circle, List, Search } from "lucide-react";

function FilterControls({
  filter,
  setFilter,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
}) {
  return (
    <div className="premium-task-card">
      <div className="relative group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors z-10" />
        <input
          type="text"
          placeholder="Search community tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="premium-input"
        />
      </div>

      <div className="flex flex-col xs:flex-row justify-between items-stretch xs:items-center gap-4 mt-4">
        <div className="priority-pill-container overflow-x-auto no-scrollbar flex-1 sm:flex-none">
          <button
            className={`filter-pill flex items-center gap-2 ${
              filter === "all" ? "active" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            <List size={14} /> All
          </button>
          <button
            className={`filter-pill flex items-center gap-2 ${
              filter === "active" ? "active" : ""
            }`}
            onClick={() => setFilter("active")}
          >
            <Circle size={14} /> Active
          </button>
          <button
            className={`filter-pill flex items-center gap-2 ${
              filter === "done" ? "active" : ""
            }`}
            onClick={() => setFilter("done")}
          >
            <CheckCircle2 size={14} /> Done
          </button>
        </div>

        <div className="flex items-center gap-3 self-end xs:self-auto">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold uppercase tracking-widest">
            <SortAsc size={14} className="text-accent-primary/50" />
            <span>Sort By:</span>
          </div>
          <div className="priority-pill-container">
            <button
              className={`filter-pill px-4 py-1.5 ${
                sortBy === "time" ? "active" : ""
              }`}
              onClick={() => setSortBy("time")}
            >
              Time
            </button>
            <button
              className={`filter-pill px-4 py-1.5 ${
                sortBy === "priority" ? "active" : ""
              }`}
              onClick={() => setSortBy("priority")}
            >
              Priority
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilterControls;
