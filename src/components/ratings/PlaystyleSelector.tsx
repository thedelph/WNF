import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

interface Playstyle {
  id: string;
  name: string;
  category: 'attacking' | 'midfield' | 'defensive';
  description: string;
  pace_weight: number;
  shooting_weight: number;
  passing_weight: number;
  dribbling_weight: number;
  defending_weight: number;
  physical_weight: number;
}

interface PlaystyleSelectorProps {
  selectedPlaystyleId: string | null;
  onPlaystyleChange: (playstyleId: string | null) => void;
  disabled?: boolean;
}

export default function PlaystyleSelector({ 
  selectedPlaystyleId, 
  onPlaystyleChange,
  disabled = false 
}: PlaystyleSelectorProps) {
  const [playstyles, setPlaystyles] = useState<Playstyle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaystyles();
  }, []);

  const fetchPlaystyles = async () => {
    try {
      const { data, error } = await supabase
        .from('playstyles')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setPlaystyles(data || []);
    } catch (error) {
      console.error('Error fetching playstyles:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedPlaystyles = playstyles.reduce((acc, style) => {
    if (!acc[style.category]) {
      acc[style.category] = [];
    }
    acc[style.category].push(style);
    return acc;
  }, {} as Record<string, Playstyle[]>);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'attacking':
        return '⚔️ Attacking Styles';
      case 'midfield':
        return '🎯 Midfield Styles';
      case 'defensive':
        return '🛡️ Defensive Styles';
      default:
        return category;
    }
  };

  const getAttributesDisplay = (style: Playstyle) => {
    // Calculate total weight for this playstyle
    const totalWeight = 
      style.pace_weight + 
      style.shooting_weight + 
      style.passing_weight + 
      style.dribbling_weight + 
      style.defending_weight + 
      style.physical_weight;
    
    // Calculate percentage distribution (how much each attribute contributes to the total)
    const attributes = [];
    if (style.pace_weight > 0) {
      const percentage = ((style.pace_weight / totalWeight) * 100).toFixed(1);
      attributes.push(`Pace: ${percentage}%`);
    }
    if (style.shooting_weight > 0) {
      const percentage = ((style.shooting_weight / totalWeight) * 100).toFixed(1);
      attributes.push(`Shooting: ${percentage}%`);
    }
    if (style.passing_weight > 0) {
      const percentage = ((style.passing_weight / totalWeight) * 100).toFixed(1);
      attributes.push(`Passing: ${percentage}%`);
    }
    if (style.dribbling_weight > 0) {
      const percentage = ((style.dribbling_weight / totalWeight) * 100).toFixed(1);
      attributes.push(`Dribbling: ${percentage}%`);
    }
    if (style.defending_weight > 0) {
      const percentage = ((style.defending_weight / totalWeight) * 100).toFixed(1);
      attributes.push(`Defending: ${percentage}%`);
    }
    if (style.physical_weight > 0) {
      const percentage = ((style.physical_weight / totalWeight) * 100).toFixed(1);
      attributes.push(`Physical: ${percentage}%`);
    }
    
    return attributes.join(', ');
  };

  if (loading) {
    return (
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Playstyle</span>
        </label>
        <div className="skeleton h-10 w-full"></div>
      </div>
    );
  }

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">Playstyle</span>
        <span className="label-text-alt text-xs opacity-70">Optional - How they play</span>
      </label>
      <select
        className="select select-bordered w-full"
        value={selectedPlaystyleId || ''}
        onChange={(e) => onPlaystyleChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">No playstyle selected</option>
        {Object.entries(groupedPlaystyles).map(([category, styles]) => (
          <optgroup key={category} label={getCategoryLabel(category)}>
            {styles.map((style) => (
              <option 
                key={style.id} 
                value={style.id}
                title={getAttributesDisplay(style)}
              >
                {style.name} - {style.description}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      
      {selectedPlaystyleId && (
        <div className="text-xs mt-2 p-2 bg-base-200 rounded-lg">
          {(() => {
            const selected = playstyles.find(s => s.id === selectedPlaystyleId);
            if (!selected) return null;
            
            return (
              <div>
                <div className="font-medium mb-1">{selected.name}</div>
                <div className="opacity-70">{getAttributesDisplay(selected)}</div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}