import React from 'react';
import clsx from 'clsx';

interface ReserveXPSectionProps {
  reserveXP: number;
  reserveCount: number;
}

const ReserveXPSection: React.FC<ReserveXPSectionProps> = ({
  reserveXP,
  reserveCount,
}) => {
  if (reserveXP <= 0) return null;

  return (
    <div className="space-y-4 mb-6">
      <h4 className="font-medium text-primary border-b border-base-300 pb-2">
        Reserve XP
      </h4>
      
      {/* Reserve Bonus */}
      <div className={clsx("card shadow-sm", "bg-base-100")}>
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium text-base-content">
                Reserve Bonus
              </h5>
              <p className="text-sm opacity-70 text-base-content/70">
                For being a reserve ({reserveCount} time{reserveCount !== 1 ? 's' : ''})
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-base-content">
                +{reserveXP} XP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveXPSection;
