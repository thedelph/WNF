/**
 * AddHighlightForm - Modal form for submitting timestamped video highlights
 * Supports 6 highlight types with goal scorer attribution and capacity checks
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle, Check } from 'lucide-react';
import { HIGHLIGHT_TYPES, HighlightType, CreateHighlightInput } from '../../types/highlights';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { parseTimestamp, formatTimestamp } from '../../utils/youtube';
import { containsBannedWords } from '../../utils/moderation';

interface AddHighlightFormProps {
  gameId: string;
  registrations: GameDetailRegistration[];
  scoreBlue: number | null;
  scoreOrange: number | null;
  existingGoals: { blue: number; orange: number };
  /** Pre-populated from current video playback position (seconds), or null */
  initialTimestamp: number | null;
  onSubmit: (input: CreateHighlightInput) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export const AddHighlightForm: React.FC<AddHighlightFormProps> = ({
  gameId,
  registrations,
  scoreBlue,
  scoreOrange,
  existingGoals,
  initialTimestamp,
  onSubmit,
  onClose,
}) => {
  const [highlightType, setHighlightType] = useState<HighlightType>('moment');
  const [timestampInput, setTimestampInput] = useState(
    initialTimestamp !== null && initialTimestamp > 0 ? formatTimestamp(initialTimestamp) : ''
  );
  const [description, setDescription] = useState('');
  const [scorerPlayerId, setScorerPlayerId] = useState('');
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [isPenalty, setIsPenalty] = useState(false);
  const [assisterPlayerId, setAssisterPlayerId] = useState('');
  const [involvedPlayerId, setInvolvedPlayerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGoal = highlightType === 'goal';

  // Group players by team for the scorer dropdown
  const teamPlayers = useMemo(() => {
    const blue = registrations
      .filter(r => r.team === 'blue' && r.status === 'selected')
      .map(r => r.player)
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
    const orange = registrations
      .filter(r => r.team === 'orange' && r.status === 'selected')
      .map(r => r.player)
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
    return { blue, orange };
  }, [registrations]);

  // Determine scorer's actual team from selection
  const scorerActualTeam = useMemo((): 'blue' | 'orange' | null => {
    if (!scorerPlayerId) return null;
    if (teamPlayers.blue.some(p => p.id === scorerPlayerId)) return 'blue';
    if (teamPlayers.orange.some(p => p.id === scorerPlayerId)) return 'orange';
    return null;
  }, [scorerPlayerId, teamPlayers]);

  // For own goals, credit goes to the OTHER team
  const scorerTeam = scorerActualTeam
    ? (isOwnGoal ? (scorerActualTeam === 'blue' ? 'orange' : 'blue') : scorerActualTeam)
    : null;

  // Players eligible to assist: teammates from the credited team, excluding the scorer
  const assistEligiblePlayers = useMemo(() => {
    if (!scorerTeam || isOwnGoal) return [];
    const teamList = scorerTeam === 'blue' ? teamPlayers.blue : teamPlayers.orange;
    return teamList.filter(p => p.id !== scorerPlayerId);
  }, [scorerTeam, isOwnGoal, teamPlayers, scorerPlayerId]);

  // Goal capacity checks
  const blueGoalsRemaining = (scoreBlue ?? 0) - existingGoals.blue;
  const orangeGoalsRemaining = (scoreOrange ?? 0) - existingGoals.orange;
  const allGoalsClaimed = blueGoalsRemaining <= 0 && orangeGoalsRemaining <= 0;
  const selectedTeamAtCapacity = scorerTeam
    ? (scorerTeam === 'blue' ? blueGoalsRemaining <= 0 : orangeGoalsRemaining <= 0)
    : false;

  // Validation
  const parsedTimestamp = parseTimestamp(timestampInput);
  const timestampValid = parsedTimestamp !== null;
  const descriptionTrimmed = description.trim();
  const descriptionValid = isGoal
    ? descriptionTrimmed.length <= 200
    : descriptionTrimmed.length >= 3 && descriptionTrimmed.length <= 200;
  const moderationResult = descriptionTrimmed.length > 0 ? containsBannedWords(descriptionTrimmed) : { hasBanned: false };
  const goalValid = !isGoal || (!!scorerPlayerId && !selectedTeamAtCapacity);

  const canSubmit = timestampValid && descriptionValid && !moderationResult.hasBanned && goalValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || parsedTimestamp === null) return;

    setSubmitting(true);
    setError(null);

    const input: CreateHighlightInput = {
      game_id: gameId,
      highlight_type: highlightType,
      timestamp_seconds: parsedTimestamp,
      description: descriptionTrimmed,
    };

    if (isGoal && scorerPlayerId && scorerTeam) {
      input.scorer_player_id = scorerPlayerId;
      input.scorer_team = scorerTeam;
      input.is_own_goal = isOwnGoal;
      input.is_penalty = isPenalty;
      if (assisterPlayerId && !isOwnGoal) {
        input.assister_player_id = assisterPlayerId;
      }
    } else if (!isGoal && involvedPlayerId) {
      // Reuse scorer_player_id for non-goal player tagging
      input.scorer_player_id = involvedPlayerId;
      const involvedTeam = teamPlayers.blue.some(p => p.id === involvedPlayerId) ? 'blue' : 'orange';
      input.scorer_team = involvedTeam;
    }

    const result = await onSubmit(input);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to add highlight');
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="card bg-base-100 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <form onSubmit={handleSubmit}>
            <div className="card-body gap-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="card-title text-lg">Add Highlight</h3>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Highlight Type Selection */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm font-medium">Type</legend>
                <div className="grid grid-cols-3 gap-2">
                  {HIGHLIGHT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setHighlightType(type.value);
                        if (type.value !== 'goal') {
                          setScorerPlayerId('');
                          setIsOwnGoal(false);
                          setIsPenalty(false);
                          setAssisterPlayerId('');
                        }
                      }}
                      className={`btn btn-sm gap-1.5 transition-all ${
                        highlightType === type.value
                          ? 'btn-primary shadow-md scale-[1.02]'
                          : 'btn-ghost bg-base-200 hover:bg-base-300'
                      }`}
                    >
                      <span className="text-base">{type.emoji}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Timestamp Input */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm font-medium">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Timestamp
                </legend>
                <input
                  type="text"
                  value={timestampInput}
                  onChange={(e) => setTimestampInput(e.target.value)}
                  placeholder="MM:SS (e.g. 12:34)"
                  className={`input input-bordered w-full font-mono ${
                    timestampInput && !timestampValid ? 'input-error' : ''
                  }`}
                  autoFocus
                />
                {timestampInput && !timestampValid && (
                  <p className="text-xs text-error mt-1">Enter a valid timestamp (MM:SS or H:MM:SS)</p>
                )}
              </fieldset>

              {/* Description */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-sm font-medium">
                  Description{isGoal && <span className="text-base-content/40 font-normal ml-1">(optional)</span>}
                </legend>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isGoal ? 'Add details (optional)' : 'What happened at this moment?'}
                  maxLength={200}
                  rows={2}
                  className={`textarea textarea-bordered w-full resize-none ${
                    moderationResult.hasBanned ? 'textarea-error' : ''
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {moderationResult.hasBanned ? (
                    <p className="text-xs text-error">Please keep it clean!</p>
                  ) : !isGoal && descriptionTrimmed.length > 0 && descriptionTrimmed.length < 3 ? (
                    <p className="text-xs text-warning">At least 3 characters required</p>
                  ) : (
                    <span />
                  )}
                  <span className={`text-xs ${descriptionTrimmed.length > 180 ? 'text-warning' : 'text-base-content/50'}`}>
                    {descriptionTrimmed.length}/200
                  </span>
                </div>
              </fieldset>

              {/* Goal Scorer (conditional) */}
              {isGoal && (
                <motion.fieldset
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="fieldset"
                >
                  <legend className="fieldset-legend text-sm font-medium">Goal Scorer</legend>

                  {allGoalsClaimed ? (
                    <div className="alert alert-warning text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>All goals for this match have been claimed ({scoreBlue}-{scoreOrange})</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={scorerPlayerId}
                        onChange={(e) => {
                          setScorerPlayerId(e.target.value);
                          setAssisterPlayerId('');
                        }}
                        className={`select select-bordered w-full ${selectedTeamAtCapacity ? 'select-error' : ''}`}
                      >
                        <option value="">Select scorer...</option>
                        {teamPlayers.blue.length > 0 && (
                          <optgroup label={`Blue Team (${blueGoalsRemaining} goal${blueGoalsRemaining !== 1 ? 's' : ''} remaining)`}>
                            {teamPlayers.blue.map((p) => (
                              <option key={p.id} value={p.id}>{p.friendly_name}</option>
                            ))}
                          </optgroup>
                        )}
                        {teamPlayers.orange.length > 0 && (
                          <optgroup label={`Orange Team (${orangeGoalsRemaining} goal${orangeGoalsRemaining !== 1 ? 's' : ''} remaining)`}>
                            {teamPlayers.orange.map((p) => (
                              <option key={p.id} value={p.id}>{p.friendly_name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>

                      {selectedTeamAtCapacity && (
                        <p className="text-xs text-error mt-1">
                          All goals for the {scorerTeam === 'blue' ? 'Blue' : 'Orange'} team have been claimed
                          {isOwnGoal && scorerActualTeam && (
                            <span className="block mt-0.5 text-base-content/50">
                              (own goal credits the {scorerTeam === 'blue' ? 'Blue' : 'Orange'} team)
                            </span>
                          )}
                        </p>
                      )}

                      {/* Own Goal toggle */}
                      {scorerPlayerId && (
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isOwnGoal}
                            onChange={(e) => {
                              setIsOwnGoal(e.target.checked);
                              if (e.target.checked) {
                                setAssisterPlayerId('');
                              }
                            }}
                            className="checkbox checkbox-sm checkbox-error"
                          />
                          <span className="text-sm">Own Goal</span>
                          {isOwnGoal && scorerActualTeam && (
                            <span className="text-xs text-base-content/50">
                              (credits {scorerActualTeam === 'blue' ? 'Orange' : 'Blue'} team)
                            </span>
                          )}
                        </label>
                      )}

                      {/* Penalty toggle */}
                      {scorerPlayerId && (
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPenalty}
                            onChange={(e) => setIsPenalty(e.target.checked)}
                            className="checkbox checkbox-sm checkbox-warning"
                          />
                          <span className="text-sm">Penalty</span>
                        </label>
                      )}

                      {/* Assist dropdown */}
                      {scorerPlayerId && !isOwnGoal && assistEligiblePlayers.length > 0 && (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-base-content/60 mb-1 block">
                            Assisted by <span className="text-base-content/40 font-normal">(optional)</span>
                          </label>
                          <select
                            value={assisterPlayerId}
                            onChange={(e) => setAssisterPlayerId(e.target.value)}
                            className="select select-bordered select-sm w-full"
                          >
                            <option value="">No assist</option>
                            {assistEligiblePlayers.map((p) => (
                              <option key={p.id} value={p.id}>{p.friendly_name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Goal capacity summary */}
                      <div className="flex gap-3 mt-2 text-xs text-base-content/60">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          Blue: {existingGoals.blue}/{scoreBlue ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          Orange: {existingGoals.orange}/{scoreOrange ?? 0}
                        </span>
                      </div>
                    </>
                  )}
                </motion.fieldset>
              )}

              {/* Player Involved (non-goal highlights) */}
              {!isGoal && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-sm font-medium">
                    Player Involved <span className="text-base-content/40 font-normal">(optional)</span>
                  </legend>
                  <select
                    value={involvedPlayerId}
                    onChange={(e) => setInvolvedPlayerId(e.target.value)}
                    className="select select-bordered w-full"
                  >
                    <option value="">None</option>
                    {teamPlayers.blue.length > 0 && (
                      <optgroup label="Blue Team">
                        {teamPlayers.blue.map((p) => (
                          <option key={p.id} value={p.id}>{p.friendly_name}</option>
                        ))}
                      </optgroup>
                    )}
                    {teamPlayers.orange.length > 0 && (
                      <optgroup label="Orange Team">
                        {teamPlayers.orange.map((p) => (
                          <option key={p.id} value={p.id}>{p.friendly_name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </fieldset>
              )}

              {/* Error display */}
              {error && (
                <div className="alert alert-error text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="card-actions justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn btn-primary btn-sm gap-1.5"
                >
                  {submitting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Add Highlight
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddHighlightForm;
