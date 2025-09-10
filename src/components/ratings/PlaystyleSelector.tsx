import React, { useState, useEffect } from 'react';
import { 
  AttributeCombination, 
  AttributeKey, 
  ATTRIBUTE_CONFIGS,
  generatePlaystyleName,
  generatePlaystyleCompact,
  getAttributeCombination,
  getSelectedAttributeKeys,
  isPredefinedPlaystyle
} from '../../types/playstyle';

interface PlaystyleSelectorProps {
  selectedAttributes: AttributeCombination | null;
  onAttributesChange: (attributes: AttributeCombination | null) => void;
  disabled?: boolean;
}

export default function PlaystyleSelector({ 
  selectedAttributes, 
  onAttributesChange,
  disabled = false 
}: PlaystyleSelectorProps) {
  const [checkedAttributes, setCheckedAttributes] = useState<AttributeKey[]>([]);

  // Initialize checked attributes from props
  useEffect(() => {
    if (selectedAttributes) {
      setCheckedAttributes(getSelectedAttributeKeys(selectedAttributes));
    } else {
      setCheckedAttributes([]);
    }
  }, [selectedAttributes]);

  const toggleAttribute = (attributeKey: AttributeKey) => {
    if (disabled) return;
    
    const newChecked = checkedAttributes.includes(attributeKey)
      ? checkedAttributes.filter(key => key !== attributeKey)
      : [...checkedAttributes, attributeKey];
    
    setCheckedAttributes(newChecked);
    
    // Convert to AttributeCombination and call parent handler
    const newAttributeCombination = newChecked.length > 0 
      ? getAttributeCombination(newChecked) 
      : null;
    
    onAttributesChange(newAttributeCombination);
  };

  const clearSelection = () => {
    if (disabled) return;
    setCheckedAttributes([]);
    onAttributesChange(null);
  };

  // Generate current playstyle name
  const currentAttributeCombination = checkedAttributes.length > 0 
    ? getAttributeCombination(checkedAttributes) 
    : null;
  
  const playstyleName = currentAttributeCombination 
    ? generatePlaystyleName(currentAttributeCombination)
    : 'No Style Selected';
    
  const playstyleCompact = currentAttributeCombination 
    ? generatePlaystyleCompact(currentAttributeCombination)
    : 'None';

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">Player Attributes</span>
        {checkedAttributes.length > 0 && (
          <button
            type="button"
            className="label-text-alt text-xs opacity-70 hover:opacity-100 cursor-pointer underline"
            onClick={clearSelection}
            disabled={disabled}
          >
            Clear all
          </button>
        )}
      </label>
      
      <div className="mb-3 p-4 bg-base-200 rounded-lg">
        <div className="text-sm font-medium mb-3">Select attributes this player has:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ATTRIBUTE_CONFIGS.map(attr => (
            <label 
              key={attr.key} 
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                checkedAttributes.includes(attr.key)
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-base-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={checkedAttributes.includes(attr.key)}
                onChange={() => toggleAttribute(attr.key)}
                disabled={disabled}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{attr.label}</div>
                <div className="text-xs opacity-70">{attr.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      {/* Dynamic playstyle preview */}
      <div className="text-sm mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="font-medium text-primary mb-1">
          {currentAttributeCombination && isPredefinedPlaystyle(currentAttributeCombination) 
            ? 'Classic Playstyle' 
            : 'Generated Playstyle'}
        </div>
        <div className="text-lg font-bold text-primary flex items-center gap-2">
          {playstyleName}
          {currentAttributeCombination && isPredefinedPlaystyle(currentAttributeCombination) && (
            <span className="text-xs bg-primary/20 px-2 py-1 rounded">Predefined</span>
          )}
        </div>
        {checkedAttributes.length > 0 && (
          <div className="text-xs opacity-70 mt-1">
            Compact: {playstyleCompact} • {checkedAttributes.length} attribute{checkedAttributes.length !== 1 ? 's' : ''}
          </div>
        )}
        {checkedAttributes.length === 0 && (
          <div className="text-xs opacity-70 mt-1">
            Select attributes above to generate a playstyle
          </div>
        )}
      </div>
      
      {/* Show selected attributes breakdown */}
      {checkedAttributes.length > 0 && (
        <div className="text-xs mt-2 p-2 bg-base-200 rounded-lg">
          <div className="font-medium mb-1">Selected Attributes:</div>
          <div className="flex flex-wrap gap-1">
            {checkedAttributes.map(key => {
              const config = ATTRIBUTE_CONFIGS.find(c => c.key === key);
              return config ? (
                <span 
                  key={key} 
                  className="px-2 py-1 bg-primary/20 text-primary text-xs rounded font-medium"
                  style={{ backgroundColor: `${config.color}20`, color: config.color }}
                >
                  {config.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}