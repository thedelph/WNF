import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Header from './layout/Header'
import Footer from './layout/Footer'
import { subscribeToTeamAnnouncements, showTeamAnnouncementNotification } from '../utils/teamNotifications'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      // Subscribe to team announcements
      const unsubscribe = subscribeToTeamAnnouncements(
        user.id,
        showTeamAnnouncementNotification
      );

      return () => {
        unsubscribe();
      };
    }
  }, [user?.id]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <AnimatePresence mode="wait">
        <motion.main 
          className="flex-grow container mx-auto px-4 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  )
}

export default Layout