import React from 'react';
import clsx from 'clsx';

interface StreakSectionProps {
  title: string;
  streakCount: number;
  bonusPerStreak: number;
  description: string;
}

const StreakSection: React.FC<StreakSectionProps> = ({
  title,
  streakCount,
  bonusPerStreak,
  description,
}) => {
  if (streakCount <= 0) return null;

  const bonusPercentage = streakCount * bonusPerStreak;

  return (
    <div className="space-y-4 mb-6">
      <h4 className="font-medium text-primary border-b border-base-300 pb-2">
        {title}
      </h4>
      <div className="card shadow-sm bg-success/10">
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium text-success-content">
                {title}
              </h5>
              <p className="text-sm text-success-content/70">
                {description}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-success">
                +{bonusPercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakSection;
