import React from 'react';
import { motion } from 'framer-motion';
import ChangelogEntry from '../components/changelog/ChangelogEntry';
import { changelogData } from '../utils/version';

/**
 * Changelog Page Component
 * 
 * Displays the application's changelog with expandable entries
 * Uses Framer Motion for smooth animations
 */
const Changelog: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-3xl"
    >
      <h1 className="text-3xl font-bold mb-8">Changelog</h1>
      <div className="space-y-6">
        {changelogData.map((entry) => (
          <ChangelogEntry
            key={entry.version}
            version={entry.version}
            date={entry.date}
            sections={entry.sections}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default Changelog;
