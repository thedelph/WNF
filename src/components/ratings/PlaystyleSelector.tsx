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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

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

  // Filter playstyles based on selected attributes
  const filteredPlaystyles = selectedAttributes.length > 0
    ? playstyles.filter(style => {
        return selectedAttributes.every(attr => {
          switch (attr) {
            case 'pace': return style.pace_weight > 0;
            case 'shooting': return style.shooting_weight > 0;
            case 'passing': return style.passing_weight > 0;
            case 'dribbling': return style.dribbling_weight > 0;
            case 'defending': return style.defending_weight > 0;
            case 'physical': return style.physical_weight > 0;
            default: return false;
          }
        });
      })
    : playstyles;

  const groupedPlaystyles = filteredPlaystyles.reduce((acc, style) => {
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

  const getAttributesDisplay = (style: Playstyle, compact: boolean = false) => {
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
    const attributeData = [
      { name: compact ? 'PAC' : 'Pace', weight: style.pace_weight },
      { name: compact ? 'SHO' : 'Shooting', weight: style.shooting_weight },
      { name: compact ? 'PAS' : 'Passing', weight: style.passing_weight },
      { name: compact ? 'DRI' : 'Dribbling', weight: style.dribbling_weight },
      { name: compact ? 'DEF' : 'Defending', weight: style.defending_weight },
      { name: compact ? 'PHY' : 'Physical', weight: style.physical_weight }
    ];
    
    attributeData.forEach(attr => {
      if (attr.weight > 0) {
        const percentage = ((attr.weight / totalWeight) * 100).toFixed(1);
        attributes.push({ name: attr.name, percentage });
      }
    });
    
    return attributes;
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

  const toggleAttribute = (attr: string) => {
    setSelectedAttributes(prev => 
      prev.includes(attr) 
        ? prev.filter(a => a !== attr)
        : [...prev, attr]
    );
  };

  const attributes = [
    { key: 'pace', label: 'Pace', emoji: '⚡' },
    { key: 'shooting', label: 'Shooting', emoji: '🎯' },
    { key: 'passing', label: 'Passing', emoji: '⚽' },
    { key: 'dribbling', label: 'Dribbling', emoji: '🏃' },
    { key: 'defending', label: 'Defending', emoji: '🛡️' },
    { key: 'physical', label: 'Physical', emoji: '💪' }
  ];

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">Playstyle</span>
        <button
          type="button"
          className="label-text-alt text-xs opacity-70 hover:opacity-100 cursor-pointer underline"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide filters' : 'Filter by attributes'}
        </button>
      </label>
      
      {showFilters && (
        <div className="mb-3 p-3 bg-base-200 rounded-lg">
          <div className="text-xs font-medium mb-2">Select attributes this player has:</div>
          <div className="grid grid-cols-3 gap-2">
            {attributes.map(attr => (
              <label key={attr.key} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={selectedAttributes.includes(attr.key)}
                  onChange={() => toggleAttribute(attr.key)}
                  disabled={disabled}
                />
                <span className="text-xs">
                  {attr.emoji} {attr.label}
                </span>
              </label>
            ))}
          </div>
          {selectedAttributes.length > 0 && (
            <div className="mt-2 text-xs opacity-70">
              Showing {filteredPlaystyles.length} playstyle{filteredPlaystyles.length !== 1 ? 's' : ''} with {selectedAttributes.join(' + ')}
            </div>
          )}
        </div>
      )}
      <select
        className="select select-bordered w-full"
        value={selectedPlaystyleId || ''}
        onChange={(e) => onPlaystyleChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">
          {selectedAttributes.length > 0 && filteredPlaystyles.length === 0 
            ? 'No playstyles match selected attributes' 
            : 'No playstyle selected'}
        </option>
        {Object.entries(groupedPlaystyles).map(([category, styles]) => (
          <optgroup key={category} label={getCategoryLabel(category)}>
            {styles.map((style) => {
              const attrs = getAttributesDisplay(style, false);
              const titleText = attrs.map(a => `${a.name}: ${a.percentage}%`).join(', ');
              return (
                <option 
                  key={style.id} 
                  value={style.id}
                  title={titleText}
                >
                  {style.name}: {style.description}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
      
      {selectedPlaystyleId && (
        <div className="text-xs mt-2 p-2 bg-base-200 rounded-lg">
          {(() => {
            const selected = playstyles.find(s => s.id === selectedPlaystyleId);
            if (!selected) return null;
            
            const attributes = getAttributesDisplay(selected, true);
            const isAllRounder = attributes.length === 6;
            
            return (
              <div>
                <div className="font-medium mb-1">{selected.name}</div>
                <div className="opacity-70">
                  {isAllRounder ? (
                    // Grid layout for all-rounders (6 attributes)
                    <div className="grid grid-cols-3 gap-1">
                      {attributes.map((attr, idx) => (
                        <div key={idx} className="text-center">
                          <span className="font-semibold">{attr.name}</span>
                          <span className="ml-1">{attr.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Flex wrap layout for other playstyles
                    <div className="flex flex-wrap gap-2">
                      {attributes.map((attr, idx) => (
                        <span key={idx}>
                          <span className="font-semibold">{attr.name}:</span>
                          <span className="ml-1">{attr.percentage}%</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}