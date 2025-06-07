import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  paid: boolean;
  paymentRequired: boolean;
  className?: string;
}

const PaymentStatusBadge: React.FC<Props> = ({ paid, paymentRequired, className = '' }) => {
  if (!paymentRequired) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center ${className}`}
    >
      {paid ? (
        <span className="px-2 py-1 text-sm rounded-full bg-success text-success-content">
          Paid
        </span>
      ) : (
        <span className="px-2 py-1 text-sm rounded-full bg-warning text-warning-content">
          Payment Required
        </span>
      )}
    </motion.div>
  );
};

export default PaymentStatusBadge;
