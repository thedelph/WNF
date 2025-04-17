import React from 'react';

interface TotalXPSectionProps {
  baseXP: number;
  reserveXP: number;
  streakModifier: number;
  reserveModifier: number;
  registrationModifier: number;
  unpaidGamesModifier: number;
  finalXP: number;
}

const TotalXPSection: React.FC<TotalXPSectionProps> = ({
  baseXP,
  reserveXP,
  streakModifier,
  reserveModifier,
  registrationModifier,
  unpaidGamesModifier,
  finalXP,
}) => {
  const hasModifiers = streakModifier !== 0 || reserveModifier !== 0 || 
                      registrationModifier !== 0 || unpaidGamesModifier !== 0;

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-primary border-b border-base-300 pb-2">
        Total XP
      </h4>
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium">Final XP</h5>
              <p className="text-sm text-base-content/70">
                Including all XP modifiers
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold">
                {finalXP} XP
              </div>
              <div className="text-xs text-base-content/70">
                {reserveXP !== 0 ? `(${baseXP} ${reserveXP > 0 ? '+' : ''} ${reserveXP})` : baseXP}
                {hasModifiers && 
                  ` × (1${streakModifier > 0 ? ` + ${streakModifier.toFixed(3)}` : ''}${
                    reserveModifier > 0 ? ` + ${reserveModifier.toFixed(3)}` : ''}${
                    registrationModifier > 0 ? ` + ${registrationModifier.toFixed(3)}` : ''}${
                    unpaidGamesModifier !== 0 ? ` + ${unpaidGamesModifier.toFixed(3)}` : ''})`
                }
              </div>
              <div className="text-xs text-base-content/50">
                {reserveXP !== 0 ? `(Base XP ${reserveXP > 0 ? '+' : '-'} Reserve XP)` : 'Base XP'}
                {hasModifiers && 
                  ` × (1${streakModifier > 0 ? ' + Attendance Streak Modifier' : ''}${
                    reserveModifier > 0 ? ' + Reserve Streak Modifier' : ''}${
                    registrationModifier > 0 ? ' + Registration Streak Modifier' : ''}${
                    unpaidGamesModifier !== 0 ? ' + Unpaid Games Modifier' : ''})`
                }
                {baseXP * (1 + streakModifier + reserveModifier + registrationModifier + unpaidGamesModifier) < 0 && 
                  ' (XP will never be less than 0)'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalXPSection;
