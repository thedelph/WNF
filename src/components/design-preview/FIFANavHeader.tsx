import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, ChevronDown } from 'lucide-react';
import { FIFA_COLORS } from '../../constants/fifaTheme';

interface NavItem {
  label: string;
  href: string;
  isActive?: boolean;
}

interface FIFANavHeaderProps {
  navItems?: NavItem[];
  userName?: string;
  showUserMenu?: boolean;
}

const defaultNavItems: NavItem[] = [
  { label: 'Stats', href: '#stats', isActive: true },
  { label: 'Games', href: '#games' },
  { label: 'Players', href: '#players' },
  { label: 'Ratings', href: '#ratings' },
];

export const FIFANavHeader = ({
  navItems = defaultNavItems,
  userName = 'Player',
  showUserMenu = true,
}: FIFANavHeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <nav
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${FIFA_COLORS.accent.electric}20`,
        position: 'relative',
      }}
    >
      {/* Glow line at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${FIFA_COLORS.accent.electric}60, transparent)`,
        }}
      />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${FIFA_COLORS.accent.electric}30, ${FIFA_COLORS.accent.purple}30)`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${FIFA_COLORS.accent.electric}40`,
              boxShadow: `0 0 15px ${FIFA_COLORS.accent.electric}20`,
            }}
          >
            <span
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                color: FIFA_COLORS.accent.electric,
                textShadow: `0 0 10px ${FIFA_COLORS.accent.electric}`,
              }}
            >
              WNF
            </span>
          </div>
        </motion.div>

        {/* Desktop Nav Links */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
          className="hidden md:flex"
        >
          {navItems.map((item) => (
            <FIFANavLink key={item.label} {...item} />
          ))}
        </div>

        {/* User Menu (Desktop) */}
        {showUserMenu && (
          <div className="hidden md:block relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: `linear-gradient(135deg, ${FIFA_COLORS.background.card}, ${FIFA_COLORS.background.secondary})`,
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${FIFA_COLORS.accent.electric}, ${FIFA_COLORS.accent.purple})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={14} color="white" />
              </div>
              <span>{userName}</span>
              <ChevronDown
                size={16}
                style={{
                  transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </motion.button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: FIFA_COLORS.background.card,
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: '8px',
                    padding: '0.5rem',
                    minWidth: '150px',
                    zIndex: 50,
                  }}
                >
                  {['Profile', 'Settings', 'Logout'].map((item) => (
                    <motion.button
                      key={item}
                      whileHover={{
                        backgroundColor: `${FIFA_COLORS.accent.electric}20`,
                        color: FIFA_COLORS.accent.electric,
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem 1rem',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                      }}
                    >
                      {item}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Mobile Menu Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.5rem',
          }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: FIFA_COLORS.background.secondary,
              borderTop: `1px solid rgba(255,255,255,0.05)`,
              overflow: 'hidden',
            }}
            className="md:hidden"
          >
            <div style={{ padding: '1rem' }}>
              {navItems.map((item, index) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    display: 'block',
                    padding: '0.75rem 1rem',
                    color: item.isActive ? FIFA_COLORS.accent.electric : 'rgba(255,255,255,0.7)',
                    textDecoration: 'none',
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: 500,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </motion.a>
              ))}
              {showUserMenu && (
                <div
                  style={{
                    borderTop: `1px solid rgba(255,255,255,0.1)`,
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                  }}
                >
                  {['Profile', 'Settings', 'Logout'].map((item, index) => (
                    <motion.button
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (navItems.length + index) * 0.05 }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                      }}
                    >
                      {item}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// Individual Nav Link Component
const FIFANavLink = ({ label, href, isActive }: NavItem) => {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.02 }}
      style={{
        position: 'relative',
        padding: '0.5rem 1rem',
        color: isActive ? FIFA_COLORS.accent.electric : 'rgba(255,255,255,0.6)',
        textDecoration: 'none',
        fontFamily: 'Oswald, sans-serif',
        fontWeight: 500,
        fontSize: '14px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        transition: 'color 0.2s ease',
        textShadow: isActive ? `0 0 10px ${FIFA_COLORS.accent.electric}` : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.textShadow = `0 0 8px ${FIFA_COLORS.accent.electric}80`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
          e.currentTarget.style.textShadow = 'none';
        }
      }}
    >
      {label}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: FIFA_COLORS.accent.electric,
            boxShadow: `0 0 8px ${FIFA_COLORS.accent.electric}`,
            borderRadius: '1px',
          }}
        />
      )}
    </motion.a>
  );
};

export default FIFANavHeader;
