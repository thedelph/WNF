import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  description?: string;
  leftElement?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  leftElement,
  children 
}) => {
  return (
    <motion.div 
      className="flex flex-col gap-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4">
        {leftElement && <div>{leftElement}</div>}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      {description && (
        <p className="text-gray-600">{description}</p>
      )}
      {children && (
        <div className="flex gap-2 mt-2">
          {children}
        </div>
      )}
    </motion.div>
  );
};
