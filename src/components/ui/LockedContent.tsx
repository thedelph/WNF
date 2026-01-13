import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaLock, FaSignInAlt } from 'react-icons/fa';

interface LockedContentProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  blurIntensity?: 'sm' | 'md' | 'lg';
}

/**
 * LockedContent - Shows blurred placeholder content with a login CTA overlay.
 * Used to incentivize non-logged-in users to create accounts.
 *
 * @param children - The placeholder/skeleton content to show behind the blur
 * @param title - Header text for the CTA (e.g., "Your Chemistry")
 * @param description - Description text explaining what they'd see
 * @param blurIntensity - Amount of blur: 'sm', 'md' (default), or 'lg'
 */
export const LockedContent: React.FC<LockedContentProps> = ({
  children,
  title = 'Unlock This Content',
  description = 'Log in to see your personalized stats',
  blurIntensity = 'md',
}) => {
  const location = useLocation();

  const blurClass = {
    sm: 'blur-sm',
    md: 'blur-md',
    lg: 'blur-lg',
  }[blurIntensity];

  return (
    <div className="relative w-full">
      {/* Blurred content layer */}
      <div
        className={`${blurClass} pointer-events-none select-none`}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay with CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-100/80 backdrop-blur-sm rounded-box">
        <div className="text-center p-6 max-w-xs">
          <FaLock className="text-4xl text-primary mx-auto mb-3" />
          <h3 className="font-bold text-lg text-base-content">{title}</h3>
          <p className="text-base-content/70 text-sm mb-4">{description}</p>
          <Link
            to="/login"
            state={{ from: location.pathname }}
            className="btn btn-primary btn-sm gap-2"
          >
            <FaSignInAlt />
            Log in to view
          </Link>
          <p className="text-xs text-base-content/50 mt-3">
            Don't have an account?{' '}
            <Link
              to="/register"
              state={{ from: location.pathname }}
              className="link link-primary"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LockedContent;
