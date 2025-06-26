import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interface for a single change item within a changelog entry
 */
interface ChangeItem {
  title: string;
  details?: string;
}

/**
 * Interface for the changelog entry sections (Added, Changed, Fixed)
 */
interface ChangelogSection {
  type: 'Added' | 'Changed' | 'Fixed';
  items: ChangeItem[];
}

/**
 * Props for the ChangelogEntry component
 */
interface ChangelogEntryProps {
  version: string;
  date: string;
  sections: ChangelogSection[];
  forceExpanded?: boolean | null;
  initialExpanded?: boolean;
}

/**
 * Checks if a section has meaningful content (not just N/A entries)
 */
const hasMeaningfulContent = (section: ChangelogSection): boolean => {
  return section.items.some(item => 
    item.title !== 'N/A' && 
    !item.title.startsWith('N/A (') && 
    item.title !== 'No changes in this release'
  );
};

/**
 * ChangelogEntry Component
 * 
 * Displays a single version's changelog entry with expandable sections
 * Uses Framer Motion for smooth animations and DaisyUI for styling
 */
const ChangelogEntry: React.FC<ChangelogEntryProps> = ({ version, date, sections, forceExpanded, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Effect to handle forceExpanded prop changes
  React.useEffect(() => {
    if (forceExpanded !== null && forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
      // Also expand/collapse all sections within this entry
      const newExpandedSections: { [key: string]: boolean } = {};
      sections.forEach(section => {
        if (hasMeaningfulContent(section)) {
          newExpandedSections[section.type] = forceExpanded;
        }
      });
      setExpandedSections(newExpandedSections);
    }
  }, [forceExpanded, sections]);

  // Effect to handle initialExpanded on mount
  useEffect(() => {
    if (initialExpanded && checkboxRef.current) {
      // Set the checkbox to checked state
      checkboxRef.current.checked = true;
      setIsExpanded(true);
      
      // Expand all sections within this entry when initially expanded
      const newExpandedSections: { [key: string]: boolean } = {};
      sections.forEach(section => {
        if (hasMeaningfulContent(section)) {
          newExpandedSections[section.type] = true;
        }
      });
      setExpandedSections(newExpandedSections);
    }
  }, [initialExpanded, sections]);

  const toggleSection = (sectionType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections(prev => ({
      ...prev,
      [sectionType]: !prev[sectionType]
    }));
  };

  // Filter out sections without meaningful content
  const meaningfulSections = sections.filter(hasMeaningfulContent);

  return (
    <div className="collapse collapse-arrow bg-base-200 mb-4">
      <input 
        ref={checkboxRef}
        type="checkbox" 
        checked={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
        className="peer"
      />
      <div className="collapse-title text-xl font-medium peer-checked:bg-primary/10">
        {version} - {date}
      </div>
      <div className="collapse-content">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-4"
            >
              {meaningfulSections.map((section) => (
                <div key={section.type} className="mb-4 last:mb-0">
                  <button
                    onClick={(e) => toggleSection(section.type, e)}
                    className="btn btn-ghost btn-block justify-between text-left normal-case"
                  >
                    <span className="text-lg font-semibold">{section.type}</span>
                    <motion.span
                      animate={{ rotate: expandedSections[section.type] ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      ▼
                    </motion.span>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections[section.type] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-base-300 rounded-lg mt-2">
                          {section.items.map((item, index) => (
                            <div key={index} className="mb-2 last:mb-0">
                              <div className="font-medium">{item.title}</div>
                              {item.details && (
                                <div className="text-sm opacity-70 mt-1 ml-4">
                                  {item.details}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChangelogEntry;
