/**
 * MentionTextarea - Controlled textarea with @mention autocomplete
 * Typing @ triggers a dropdown of game participants with keyboard navigation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { getCurrentMentionQuery, insertMention } from '../../utils/mentions';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  registrations: GameDetailRegistration[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  registrations,
  placeholder = 'Add a comment...',
  maxLength = 300,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter participants matching the current @query
  const matchingPlayers = React.useMemo(() => {
    if (mentionQuery === null) return [];

    const query = mentionQuery.toLowerCase();
    const players = registrations
      .filter(r => r.status === 'selected' && r.player)
      .map(r => r.player);

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = players.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    if (query === '') return unique;
    return unique.filter(p =>
      p.friendly_name.toLowerCase().includes(query)
    );
  }, [mentionQuery, registrations]);

  // Check for @query on every change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const query = getCurrentMentionQuery(newValue, cursorPos);
    setMentionQuery(query);
    setShowDropdown(query !== null);
    setSelectedIndex(0);
  }, [onChange]);

  // Keyboard navigation for the dropdown
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || matchingPlayers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, matchingPlayers.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        selectPlayer(matchingPlayers[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setMentionQuery(null);
        break;
    }
  }, [showDropdown, matchingPlayers, selectedIndex]);

  const selectPlayer = useCallback((player: { id: string; friendly_name: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const { newText, newCursorPos } = insertMention(value, cursorPos, player.friendly_name, player.id);

    onChange(newText);
    setShowDropdown(false);
    setMentionQuery(null);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [value, onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current && !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;
    const selected = dropdownRef.current.children[selectedIndex] as HTMLElement;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, showDropdown]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        rows={2}
        className="textarea textarea-bordered textarea-sm w-full resize-none"
      />

      {/* @mention autocomplete dropdown */}
      {showDropdown && matchingPlayers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-full max-h-40 overflow-y-auto bg-base-200 rounded-lg shadow-lg border border-base-300 z-50"
        >
          {matchingPlayers.map((player, i) => (
            <button
              key={player.id}
              type="button"
              onClick={() => selectPlayer(player)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-base-300 transition-colors ${
                i === selectedIndex ? 'bg-base-300' : ''
              }`}
            >
              {player.friendly_name}
            </button>
          ))}
        </div>
      )}

      {/* Character count */}
      <div className="text-right text-xs text-base-content/40 mt-0.5">
        {value.length}/{maxLength}
      </div>
    </div>
  );
};

export default MentionTextarea;
