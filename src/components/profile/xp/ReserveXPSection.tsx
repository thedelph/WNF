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
  console.log('[ReserveXPSection] Props:', { reserveXP, reserveCount });
  
  // Only return null if there's no reserve activity (both count and XP are zero)
  if (reserveXP === 0 && reserveCount === 0) {
    console.log('[ReserveXPSection] Not rendering due to no reserve activity');
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <h4 className="font-medium text-primary border-b border-base-300 pb-2">
        Reserve XP
      </h4>
      
      {/* Reserve XP Card */}
      <div className={clsx("card shadow-sm", "bg-base-100")}>
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium text-base-content">
                {reserveXP >= 0 ? 'Reserve Bonus' : 'Reserve Penalty'}
              </h5>
              <p className="text-sm opacity-70 text-base-content/70">
                {reserveXP >= 0 
                  ? `For being a reserve (${reserveCount} time${reserveCount !== 1 ? 's' : ''})`
                  : 'For declining reserve slots'}
              </p>
            </div>
            <div className="text-right">
              <div className={clsx(
                "font-mono text-lg font-bold",
                reserveXP > 0 ? "text-success" : (reserveXP < 0 ? "text-error" : "text-base-content")
              )}>
                {reserveXP > 0 ? `+${reserveXP}` : reserveXP} XP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveXPSection;
