import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Venue } from '../../../types/game';
import { supabase } from '../../../utils/supabase';
import toast from 'react-hot-toast';
import FormContainer from '../../common/containers/FormContainer';

interface Preset {
  id: string;
  name: string;
  venue_id: string;
  day_of_week: string;
  start_time: string;
  registration_hours_before: number;
  registration_hours_until: number;
  team_announcement_hours: number;
  pitch_cost: number;
}

interface Props {
  venues: Venue[];
  onUpdate: () => void;
}

const daysOfWeek = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export const PresetManagement: React.FC<Props> = ({ venues, onUpdate }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('wednesday');
  const [startTime, setStartTime] = useState('21:00');
  const [regHoursBefore, setRegHoursBefore] = useState(48);
  const [regHoursUntil, setRegHoursUntil] = useState(1);
  const [teamAnnouncementHours, setTeamAnnouncementHours] = useState(4);
  const [pitchCost, setPitchCost] = useState(50.00);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    const { data, error } = await supabase
      .from('venue_presets')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to fetch presets');
      return;
    }

    setPresets(data || []);
  };

  const resetForm = () => {
    setName('');
    setVenueId('');
    setDayOfWeek('wednesday');
    setStartTime('21:00');
    setRegHoursBefore(48);
    setRegHoursUntil(1);
    setTeamAnnouncementHours(4);
    setPitchCost(50.00);
    setEditingPreset(null);
    setIsAdding(false);
  };

  const handleEdit = (preset: Preset) => {
    setEditingPreset(preset);
    setName(preset.name);
    setVenueId(preset.venue_id);
    setDayOfWeek(preset.day_of_week);
    setStartTime(preset.start_time);
    setRegHoursBefore(preset.registration_hours_before);
    setRegHoursUntil(preset.registration_hours_until);
    setTeamAnnouncementHours(preset.team_announcement_hours || 4);
    setPitchCost(preset.pitch_cost || 50.00);
    setIsAdding(true);
  };

  const handleDelete = async (presetId: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const { error } = await supabase
        .from('venue_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      toast.success('Preset deleted successfully');
      fetchPresets();
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete preset');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPreset) {
        const { error } = await supabase
          .from('venue_presets')
          .update({
            name,
            venue_id: venueId,
            day_of_week: dayOfWeek,
            start_time: startTime,
            registration_hours_before: regHoursBefore,
            registration_hours_until: regHoursUntil,
            team_announcement_hours: teamAnnouncementHours,
            pitch_cost: pitchCost
          })
          .eq('id', editingPreset.id);

        if (error) throw error;
        toast.success('Preset updated successfully!');
      } else {
        const { error } = await supabase
          .from('venue_presets')
          .insert({
            name,
            venue_id: venueId,
            day_of_week: dayOfWeek,
            start_time: startTime,
            registration_hours_before: regHoursBefore,
            registration_hours_until: regHoursUntil,
            team_announcement_hours: teamAnnouncementHours,
            pitch_cost: pitchCost
          });

        if (error) throw error;
        toast.success('Preset created successfully!');
      }

      resetForm();
      fetchPresets();
      onUpdate();
    } catch (error) {
      toast.error(editingPreset ? 'Failed to update preset' : 'Failed to create preset');
      console.error(error);
    }
  };

  return (
    <FormContainer title="Game Presets">
      <div className="space-y-4">
        {/* Existing Presets */}
        <div className="grid gap-4">
          {presets.map((preset) => (
            <div key={preset.id} className="card bg-base-200">
              <div className="card-body p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{preset.name}</h3>
                  <div className="space-x-2">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(preset)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-error"
                      onClick={() => handleDelete(preset.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm">
                  <p>Venue: {venues.find(v => v.id === preset.venue_id)?.name}</p>
                  <p>Day: {preset.day_of_week.charAt(0).toUpperCase() + preset.day_of_week.slice(1)}</p>
                  <p>Time: {preset.start_time}</p>
                  <p>Registration: {preset.registration_hours_before}h before to {preset.registration_hours_until}h before</p>
                  <p>Team Announcement: {preset.team_announcement_hours || 4}h before game</p>
                  <p>Pitch Cost: £{preset.pitch_cost?.toFixed(2) || '50.00'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Button */}
        {!isAdding && (
          <button 
            className="btn btn-primary w-full"
            onClick={() => setIsAdding(true)}
          >
            Add New Preset
          </button>
        )}

        {/* Add/Edit Form */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Preset Name</legend>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Wednesday Night Football"
                required
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Venue</legend>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="select"
                required
              >
                <option value="">Select a venue...</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Day of Week</legend>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="select"
                required
              >
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </option>
                ))}
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Start Time</legend>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
                required
              />
            </fieldset>

            <div className="grid grid-cols-2 gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Registration Hours Before</legend>
                <input
                  type="number"
                  value={regHoursBefore}
                  onChange={(e) => setRegHoursBefore(parseInt(e.target.value))}
                  className="input"
                  min={1}
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Registration Hours Until</legend>
                <input
                  type="number"
                  value={regHoursUntil}
                  onChange={(e) => setRegHoursUntil(parseInt(e.target.value))}
                  className="input"
                  min={1}
                  required
                />
              </fieldset>
            </div>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Team Announcement Hours Before Game</legend>
              <input
                type="number"
                value={teamAnnouncementHours}
                onChange={(e) => setTeamAnnouncementHours(parseInt(e.target.value))}
                className="input"
                min={1}
                max={48}
                required
              />
              <p className="fieldset-label">Hours before game start when teams will be announced</p>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Pitch Cost (£)</legend>
              <input
                type="number"
                value={pitchCost}
                onChange={(e) => setPitchCost(parseFloat(e.target.value))}
                className="input"
                min={0}
                step={0.01}
                required
              />
              <p className="fieldset-label">Total cost for renting the pitch</p>
            </fieldset>

            <div className="flex gap-2">
              <motion.button
                type="submit"
                className="btn btn-primary flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {editingPreset ? 'Update Preset' : 'Create Preset'}
              </motion.button>
              <motion.button
                type="button"
                className="btn btn-ghost"
                onClick={resetForm}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </form>
        )}
      </div>
    </FormContainer>
  );
};
