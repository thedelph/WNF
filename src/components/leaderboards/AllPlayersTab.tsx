/**
 * AllPlayersTab component - Comprehensive searchable/sortable stats table
 * Design: Wraps existing ComprehensiveStatsTable component
 */

import { ComprehensiveStatsTable } from '../stats/ComprehensiveStatsTable';

interface AllPlayersTabProps {
  selectedYear: number | 'all';
}

export const AllPlayersTab = ({ selectedYear }: AllPlayersTabProps) => {
  return <ComprehensiveStatsTable selectedYear={selectedYear} />;
};

export default AllPlayersTab;
