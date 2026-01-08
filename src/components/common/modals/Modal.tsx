import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Size preset for the modal (maps to Tailwind max-width classes) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

/**
 * Reusable modal component with animation and backdrop
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth,
  size
}) => {
  // Use size prop to determine maxWidth if provided, otherwise fall back to maxWidth prop
  const effectiveMaxWidth = size || maxWidth || '4xl';
  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      console.log('Escape key pressed, calling onClose');
      onClose();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-${effectiveMaxWidth} max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{title}</h2>
              <motion.button 
                onClick={onClose}
                className="btn btn-ghost"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaTimes />
              </motion.button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
