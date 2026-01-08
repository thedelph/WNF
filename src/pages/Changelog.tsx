import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ChangelogEntry from '../components/changelog/ChangelogEntry';
import { changelogData } from '../utils/version';

/**
 * Changelog Page Component
 * 
 * Displays the application's changelog with expandable entries
 * Uses Framer Motion for smooth animations
 * Supports URL fragments for deep linking to specific versions
 */
const Changelog: React.FC = () => {
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  // Handle URL fragments on mount and when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the #
      if (hash) {
        setExpandedVersion(hash);
        // Scroll to the element after a short delay to ensure it's rendered
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-3xl"
    >
      <h1 className="text-3xl font-bold mb-4">Changelog</h1>
      <div className="flex justify-end mb-6">
        <div className="btn-group">
          <button
            className="btn btn-sm"
            onClick={() => setAllExpanded(true)}
          >
            Expand All
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setAllExpanded(false)}
          >
            Collapse All
          </button>
        </div>
      </div>
      <div className="space-y-6">
        {changelogData.map((entry) => (
          <div key={entry.version} id={entry.version}>
            <ChangelogEntry
              version={entry.version}
              date={entry.date}
              sections={entry.sections}
              forceExpanded={allExpanded}
              initialExpanded={expandedVersion === entry.version}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Changelog;
