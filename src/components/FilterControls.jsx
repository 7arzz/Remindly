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
    <div
      className="filter-container glass-card"
      style={{ padding: "12px", marginBottom: "16px" }}
    >
      <div className="search-bar-container" style={{ marginBottom: "12px" }}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search reminders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <List size={14} /> All
          </button>
          <button
            className={`filter-btn ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            <Circle size={14} /> Active
          </button>
          <button
            className={`filter-btn ${filter === "done" ? "active" : ""}`}
            onClick={() => setFilter("done")}
          >
            <CheckCircle2 size={14} /> Done
          </button>
        </div>

        <div className="sort-group">
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <SortAsc size={14} /> Sort:
          </span>
          <div className="mini-toggle-group">
            <button
              className={`mini-toggle-btn ${sortBy === "time" ? "active" : ""}`}
              onClick={() => setSortBy("time")}
            >
              Time
            </button>
            <button
              className={`mini-toggle-btn ${sortBy === "priority" ? "active" : ""}`}
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
