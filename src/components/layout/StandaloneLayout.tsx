import React from 'react';
import { Toaster } from 'react-hot-toast';

interface StandaloneLayoutProps {
  children: React.ReactNode;
}

// A minimal layout component for standalone pages without the main site header/navigation
const StandaloneLayout: React.FC<StandaloneLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-base-100">
      {children}
      <Toaster />
    </div>
  );
};

export default StandaloneLayout;
