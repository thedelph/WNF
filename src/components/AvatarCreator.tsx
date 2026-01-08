import React, { useState, useEffect, useRef } from 'react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

interface AvatarCreatorProps {
  onSave: (avatarOptions: any, avatarUrl: string) => void;
  onClose: () => void;
  initialOptions?: any;
  playerId?: string;
  currentAvatar?: string;
  currentOptions?: any;
}

const AvatarCreator: React.FC<AvatarCreatorProps> = ({ onSave, onClose, initialOptions, currentOptions, currentAvatar }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [avatarOptions, setAvatarOptions] = useState(currentOptions || initialOptions || {
    seed: Math.random().toString(),
  });
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const generateAvatar = async (): Promise<string> => {
    try {
      const avatar = createAvatar(avataaars, {
        seed: avatarOptions.seed,
        backgroundColor: ['transparent'],
        style: ['circle']
      });

      const dataUri = await avatar.toDataUri();
      setAvatarUrl(dataUri);
      return dataUri;
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast.error('Failed to generate avatar');
      throw error; // Throw error to be handled by caller
    }
  };

  useEffect(() => {
    generateAvatar();
  }, [avatarOptions]);

  const handleRandomize = (): void => {
    setAvatarOptions((prev: Record<string, any>) => ({
      ...prev,
      seed: Math.random().toString(),
    }));
  };

  const handleSave = async () => {
    try {
      const url = await generateAvatar();
      if (url) {
        onSave(avatarOptions, url);
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error('Failed to save avatar');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-2xl font-bold mb-4">Create Your Avatar</h3>
        
        <div className="flex flex-col items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gray-100 p-4 rounded-lg"
          >
            <img 
              src={avatarUrl || '/src/assets/default-avatar.svg'}
              alt="Avatar Preview" 
              className="w-48 h-48 rounded-full bg-white"
            />
          </motion.div>
          
          <button 
            onClick={handleRandomize}
            className="btn btn-secondary w-full"
          >
            Generate Random Avatar
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onClose}
            className="btn btn-error"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Avatar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AvatarCreator;
