/**
 * DisputeForm - Compact inline form for disputing a goal attribution
 * Supports "wrong scorer" (with proposed scorer dropdown) and "not a goal" types
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Send } from 'lucide-react';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { CreateDisputeInput, DisputeType } from '../../types/disputes';
import { containsBannedWords } from '../../utils/moderation';

interface DisputeFormProps {
  highlightId: string;
  gameId: string;
  currentScorerId: string | null;
  registrations: GameDetailRegistration[];
  onSubmit: (input: CreateDisputeInput) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export const DisputeForm: React.FC<DisputeFormProps> = ({
  highlightId,
  gameId,
  currentScorerId,
  registrations,
  onSubmit,
  onClose,
}) => {
  const [disputeType, setDisputeType] = useState<DisputeType>('wrong_scorer');
  const [proposedScorerId, setProposedScorerId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group players by team, exclude current scorer for wrong_scorer
  const teamPlayers = useMemo(() => {
    const blue = registrations
      .filter(r => r.team === 'blue' && r.status === 'selected' && r.player.id !== currentScorerId)
      .map(r => r.player)
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
    const orange = registrations
      .filter(r => r.team === 'orange' && r.status === 'selected' && r.player.id !== currentScorerId)
      .map(r => r.player)
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
    return { blue, orange };
  }, [registrations, currentScorerId]);

  // Determine proposed scorer's team
  const proposedScorerTeam = useMemo((): 'blue' | 'orange' | null => {
    if (!proposedScorerId) return null;
    if (teamPlayers.blue.some(p => p.id === proposedScorerId)) return 'blue';
    if (teamPlayers.orange.some(p => p.id === proposedScorerId)) return 'orange';
    return null;
  }, [proposedScorerId, teamPlayers]);

  // Validation
  const reasonTrimmed = reason.trim();
  const moderationResult = reasonTrimmed.length > 0 ? containsBannedWords(reasonTrimmed) : { hasBanned: false };
  const scorerValid = disputeType !== 'wrong_scorer' || !!proposedScorerId;
  const canSubmit = scorerValid && !moderationResult.hasBanned && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const input: CreateDisputeInput = {
      highlight_id: highlightId,
      game_id: gameId,
      dispute_type: disputeType,
    };

    if (disputeType === 'wrong_scorer' && proposedScorerId && proposedScorerTeam) {
      input.proposed_scorer_id = proposedScorerId;
      input.proposed_scorer_team = proposedScorerTeam;
    }

    if (reasonTrimmed) {
      input.reason = reasonTrimmed;
    }

    const result = await onSubmit(input);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to create dispute');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="mt-3 p-3 bg-base-200 rounded-lg space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Dispute Goal</span>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setDisputeType('wrong_scorer'); setProposedScorerId(''); }}
            className={`btn btn-sm flex-1 ${
              disputeType === 'wrong_scorer' ? 'btn-warning' : 'btn-ghost bg-base-300'
            }`}
          >
            Wrong Scorer
          </button>
          <button
            type="button"
            onClick={() => { setDisputeType('not_a_goal'); setProposedScorerId(''); }}
            className={`btn btn-sm flex-1 ${
              disputeType === 'not_a_goal' ? 'btn-error' : 'btn-ghost bg-base-300'
            }`}
          >
            Not a Goal
          </button>
        </div>

        {/* Proposed scorer (wrong_scorer only) */}
        {disputeType === 'wrong_scorer' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-xs text-base-content/60 mb-1 block">Actual scorer</label>
            <select
              value={proposedScorerId}
              onChange={(e) => setProposedScorerId(e.target.value)}
              className="select select-bordered select-sm w-full"
            >
              <option value="">Select the correct scorer...</option>
              {teamPlayers.blue.length > 0 && (
                <optgroup label="Blue Team">
                  {teamPlayers.blue.map(p => (
                    <option key={p.id} value={p.id}>{p.friendly_name}</option>
                  ))}
                </optgroup>
              )}
              {teamPlayers.orange.length > 0 && (
                <optgroup label="Orange Team">
                  {teamPlayers.orange.map(p => (
                    <option key={p.id} value={p.id}>{p.friendly_name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </motion.div>
        )}

        {/* Reason (optional) */}
        <div>
          <label className="text-xs text-base-content/60 mb-1 block">
            Reason <span className="text-base-content/40">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Why are you disputing this?"
            className={`textarea textarea-bordered textarea-sm w-full resize-none ${
              moderationResult.hasBanned ? 'textarea-error' : ''
            }`}
          />
          <div className="flex justify-between items-center mt-0.5">
            {moderationResult.hasBanned ? (
              <p className="text-xs text-error">Please keep it clean!</p>
            ) : <span />}
            <span className={`text-xs ${reasonTrimmed.length > 180 ? 'text-warning' : 'text-base-content/50'}`}>
              {reasonTrimmed.length}/200
            </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="alert alert-error text-xs py-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-xs">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn-warning btn-xs gap-1"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Submit Dispute
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default DisputeForm;
