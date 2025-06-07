import React from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../utils/supabase';

interface Preset {
  id: string;
  name: string;
  day_of_week: string;
  start_time: string;
  venue_id: string;
  pitch_cost: number;
  registration_hours_before: number;
  registration_hours_until: number;
  team_announcement_hours: number;
}

interface PresetSelectorProps {
  onPresetSelect: (
    date: string,
    time: string,
    venueId: string,
    pitchCost: number,
    registrationStart: string,
    registrationEnd: string,
    teamAnnouncementTime: string
  ) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ onPresetSelect }) => {
  const [presets, setPresets] = React.useState<Preset[]>([]);

  React.useEffect(() => {
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

  // Helper function to calculate days until next occurrence
  const getDaysUntilNext = (targetDay: string) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const targetDayNum = days.indexOf(targetDay.toLowerCase());
    let daysUntil = targetDayNum - today;
    if (daysUntil <= 0) daysUntil += 7;
    return daysUntil;
  };

  const handlePresetSelect = async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    // Calculate next occurrence of the day
    const today = new Date();
    const daysUntilNext = getDaysUntilNext(preset.day_of_week);
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);
    
    // Set the game date and time
    const date = nextDate.toISOString().split('T')[0];
    const time = preset.start_time;
    
    // Calculate registration window
    const gameDate = new Date(nextDate);
    const [hours, minutes] = preset.start_time.split(':');
    gameDate.setHours(parseInt(hours), parseInt(minutes));
    
    const regStart = new Date(gameDate);
    regStart.setHours(regStart.getHours() - preset.registration_hours_before);
    const registrationStart = regStart.toISOString().slice(0, 16);
    
    const regEnd = new Date(gameDate);
    regEnd.setHours(regEnd.getHours() - preset.registration_hours_until);
    const registrationEnd = regEnd.toISOString().slice(0, 16);

    // Set team announcement time using the preset hours
    const announcementTime = new Date(gameDate);
    announcementTime.setHours(announcementTime.getHours() - (preset.team_announcement_hours || 4));
    const teamAnnouncementTime = announcementTime.toISOString().slice(0, 16);

    onPresetSelect(
      date,
      time,
      preset.venue_id,
      preset.pitch_cost || 0,
      registrationStart,
      registrationEnd,
      teamAnnouncementTime
    );
  };

  return (
    <div className="mb-4">
      <label className="label">
        <span className="label-text">Select Preset</span>
      </label>
      <select
        className="select select-bordered w-full"
        onChange={(e) => handlePresetSelect(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>Select a preset</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </div>
  );
};
