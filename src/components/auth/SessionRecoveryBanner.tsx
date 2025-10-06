import React from 'react'
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

interface SessionRecoveryBannerProps {
  sessionHealth: 'healthy' | 'degraded' | 'unhealthy'
  isRecovering: boolean
  onRecoverSession: () => Promise<boolean>
  error?: Error | null
}

export const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  sessionHealth,
  isRecovering,
  onRecoverSession,
  error
}) => {
  if (sessionHealth === 'healthy' && !error) {
    return null
  }

  const handleRecovery = async () => {
    try {
      const success = await onRecoverSession()
      if (!success) {
        console.log('Session recovery failed')
      }
    } catch (error) {
      console.error('Recovery error:', error)
    }
  }

  // Show recovery in progress
  if (isRecovering) {
    return (
      <div className="alert alert-info shadow-lg mb-4">
        <RefreshCw className="animate-spin w-5 h-5" />
        <div>
          <h3 className="font-bold">Recovering Session</h3>
          <div className="text-xs">Please wait while we restore your session...</div>
        </div>
      </div>
    )
  }

  // Show unhealthy session warning
  if (sessionHealth === 'unhealthy' || error?.message?.includes('refresh_token')) {
    return (
      <div className="alert alert-error shadow-lg mb-4">
        <XCircle className="w-5 h-5" />
        <div className="flex-1">
          <h3 className="font-bold">Session Issue Detected</h3>
          <div className="text-xs">
            {error?.message?.includes('Invalid login credentials')
              ? 'Your login credentials appear to be incorrect. If this persists after a password reset, please contact support.'
              : 'Your session has expired or become invalid. This often happens after updates.'}
          </div>
        </div>
        <button
          onClick={handleRecovery}
          className="btn btn-sm btn-ghost"
          disabled={isRecovering}
        >
          Try Recovery
        </button>
      </div>
    )
  }

  // Show degraded session warning
  if (sessionHealth === 'degraded') {
    return (
      <div className="alert alert-warning shadow-lg mb-4">
        <AlertTriangle className="w-5 h-5" />
        <div className="flex-1">
          <h3 className="font-bold">Session May Be Unstable</h3>
          <div className="text-xs">We detected potential issues with your session.</div>
        </div>
        <button
          onClick={handleRecovery}
          className="btn btn-sm btn-ghost"
          disabled={isRecovering}
        >
          Refresh Session
        </button>
      </div>
    )
  }

  return null
}

export default SessionRecoveryBanner