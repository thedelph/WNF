import React from 'react';
import { GameFormData } from '../../../types/game';

interface TeamAnnouncementPhaseDetailsProps {
  formData: Partial<GameFormData>;
  onChange: (field: string, value: any) => void;
}

/**
 * Component for handling team announcement phase specific details
 * This includes team assignments and balancing information
 */
const TeamAnnouncementPhaseDetails: React.FC<TeamAnnouncementPhaseDetailsProps> = ({ formData, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Team A Section */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Team A Players</span>
          </label>
          <select
            multiple
            value={formData.teamAPlayers || []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              onChange('teamAPlayers', selectedOptions);
            }}
            className="select select-bordered w-full h-48"
          >
            {/* Player options will be populated from the database */}
          </select>
          
          {/* Team A Stats Display */}
          <div className="mt-2 text-sm">
            <p>Attack Rating: {formData.teamAAttackRating || 0}</p>
            <p>Defense Rating: {formData.teamADefenseRating || 0}</p>
          </div>
        </div>

        {/* Team B Section */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Team B Players</span>
          </label>
          <select
            multiple
            value={formData.teamBPlayers || []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              onChange('teamBPlayers', selectedOptions);
            }}
            className="select select-bordered w-full h-48"
          >
            {/* Player options will be populated from the database */}
          </select>
          
          {/* Team B Stats Display */}
          <div className="mt-2 text-sm">
            <p>Attack Rating: {formData.teamBAttackRating || 0}</p>
            <p>Defense Rating: {formData.teamBDefenseRating || 0}</p>
          </div>
        </div>
      </div>

      {/* Team Balance Indicator */}
      <div className="alert alert-info">
        <div>
          <span className="font-bold">Team Balance:</span>
          <span className="ml-2">
            {Math.abs((formData.teamAAttackRating || 0) - (formData.teamBAttackRating || 0)) <= 5 &&
             Math.abs((formData.teamADefenseRating || 0) - (formData.teamBDefenseRating || 0)) <= 5
              ? 'Teams are balanced'
              : 'Teams need rebalancing'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TeamAnnouncementPhaseDetails;
