import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './layout/Header'
import Footer from './layout/Footer'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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