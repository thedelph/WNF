import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCurrentVersion } from '../../utils/version';

/**
 * VersionLink Component
 * 
 * Displays the current version of the application with a link to the changelog
 * Includes hover animation for better user interaction
 * 
 * @returns {JSX.Element} A version number that links to the changelog
 */
const VersionLink: React.FC = () => {
  const version = `v${getCurrentVersion()}`;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <Link 
        to="/changelog"
        className="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200"
        title="View Changelog"
      >
        {version}
      </Link>
    </motion.div>
  );
};

export default VersionLink;
