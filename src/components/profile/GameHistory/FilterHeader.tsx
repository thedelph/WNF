interface FilterHeaderProps {
  filters: {
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    team: '' | 'Blue' | 'Orange';
    outcome: '' | 'Won' | 'Lost' | 'Draw' | 'Unknown';
  };
  setFilters: (filters: any) => void;
}

export const FilterHeader = ({ filters, setFilters }: FilterHeaderProps) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-base-200 rounded-lg">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Date Range</legend>
        <div className="flex gap-2">
          <input
            type="date"
            className="input input-sm"
            onChange={(e) => setFilters(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, start: e.target.value ? new Date(e.target.value) : null }
            }))}
          />
          <input
            type="date"
            className="input input-sm"
            onChange={(e) => setFilters(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, end: e.target.value ? new Date(e.target.value) : null }
            }))}
          />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Team</legend>
        <select
          className="select select-sm"
          value={filters.team}
          onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value as typeof filters.team }))}
        >
          <option value="">All Teams</option>
          <option value="Blue">Blue</option>
          <option value="Orange">Orange</option>
        </select>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Outcome</legend>
        <select
          className="select select-sm"
          value={filters.outcome}
          onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value as typeof filters.outcome }))}
        >
          <option value="">All Outcomes</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
          <option value="Draw">Draw</option>
          <option value="Unknown">Unknown</option>
        </select>
      </fieldset>

      <div className="self-end">
        <button
          className="btn btn-sm"
          onClick={() => setFilters({
            dateRange: { start: null, end: null },
            team: '',
            outcome: ''
          })}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
