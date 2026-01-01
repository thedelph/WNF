import React from 'react'
import VersionLink from './VersionLink'

/**
 * Footer Component
 * 
 * Displays the main footer of the application including copyright information
 * and version number with changelog link
 * 
 * @returns {JSX.Element} The footer component with copyright and version info
 */
const Footer: React.FC = () => {
  return (
    <footer className="footer footer-center p-4 bg-base-300 text-base-content">
      <div className="flex flex-col items-center gap-1">
        <p>Copyright  {new Date().getFullYear()} - Wednesday Night Football</p>
        <VersionLink />
      </div>
    </footer>
  )
}

export default Footer
