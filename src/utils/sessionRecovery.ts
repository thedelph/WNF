import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

const SESSION_VERSION = '1.0.0'
const SESSION_STORAGE_KEY = 'wnf_session_v2'
const SESSION_HEALTH_KEY = 'wnf_session_health'
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

interface StoredSession {
  version: string
  session: Session | null
  timestamp: number
  deploymentId?: string
}

interface SessionHealth {
  lastSuccessfulAuth: number
  failureCount: number
  lastFailureTimestamp?: number
  affectedUsers?: string[]
}

export class SessionRecoveryManager {
  private static instance: SessionRecoveryManager
  private retryAttempts = 0
  private isRecovering = false

  static getInstance(): SessionRecoveryManager {
    if (!SessionRecoveryManager.instance) {
      SessionRecoveryManager.instance = new SessionRecoveryManager()
    }
    return SessionRecoveryManager.instance
  }

  // Store session with versioning and timestamp
  async storeSession(session: Session | null): Promise<void> {
    try {
      const storedSession: StoredSession = {
        version: SESSION_VERSION,
        session,
        timestamp: Date.now(),
        deploymentId: this.getDeploymentId()
      }

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession))
      this.updateSessionHealth(true)
    } catch (error) {
      console.error('Failed to store session:', error)
    }
  }

  // Retrieve session with validation
  async getStoredSession(): Promise<Session | null> {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!stored) return null

      const storedSession: StoredSession = JSON.parse(stored)

      // Check version compatibility
      if (storedSession.version !== SESSION_VERSION) {
        console.log('Session version mismatch, clearing old session')
        this.clearSession()
        return null
      }

      // Check if session is too old (24 hours)
      const dayInMs = 24 * 60 * 60 * 1000
      if (Date.now() - storedSession.timestamp > dayInMs) {
        console.log('Session too old, clearing')
        this.clearSession()
        return null
      }

      // Check if deployment has changed
      if (storedSession.deploymentId && storedSession.deploymentId !== this.getDeploymentId()) {
        console.log('Deployment changed, attempting session recovery')
        return await this.recoverSessionAfterDeployment(storedSession.session)
      }

      return storedSession.session
    } catch (error) {
      console.error('Failed to retrieve session:', error)
      this.clearSession()
      return null
    }
  }

  // Recover session after deployment
  private async recoverSessionAfterDeployment(oldSession: Session | null): Promise<Session | null> {
    if (!oldSession || this.isRecovering) return null

    this.isRecovering = true
    try {
      // Try to refresh the session with the old refresh token
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: oldSession.refresh_token
      })

      if (!error && data.session) {
        console.log('Session successfully recovered after deployment')
        await this.storeSession(data.session)
        this.updateSessionHealth(true)
        return data.session
      }

      console.error('Failed to recover session after deployment:', error)
      this.updateSessionHealth(false)
      return null
    } catch (error) {
      console.error('Session recovery error:', error)
      this.updateSessionHealth(false)
      return null
    } finally {
      this.isRecovering = false
    }
  }

  // Attempt automatic recovery with exponential backoff
  async attemptRecovery(): Promise<Session | null> {
    if (this.retryAttempts >= MAX_RETRY_ATTEMPTS) {
      console.log('Max recovery attempts reached')
      return null
    }

    this.retryAttempts++
    const delay = RETRY_DELAY_MS * Math.pow(2, this.retryAttempts - 1)

    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      // First, try to get the current session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (!error && session) {
        console.log('Session recovered successfully')
        this.retryAttempts = 0
        await this.storeSession(session)
        return session
      }

      // If that fails, try to refresh with stored token
      const storedSession = await this.getStoredSession()
      if (storedSession?.refresh_token) {
        const { data, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: storedSession.refresh_token
        })

        if (!refreshError && data.session) {
          console.log('Session refreshed successfully')
          this.retryAttempts = 0
          await this.storeSession(data.session)
          return data.session
        }
      }

      return null
    } catch (error) {
      console.error('Recovery attempt failed:', error)
      return null
    }
  }

  // Clear session data
  clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    this.retryAttempts = 0
    this.isRecovering = false
  }

  // Get deployment ID (changes with each deployment)
  private getDeploymentId(): string {
    // This could be set during build time or from an environment variable
    // For now, we'll use a timestamp that changes with page reload
    return window.__DEPLOYMENT_ID__ || 'default'
  }

  // Update session health metrics
  private updateSessionHealth(success: boolean): void {
    try {
      const healthData = localStorage.getItem(SESSION_HEALTH_KEY)
      const health: SessionHealth = healthData ? JSON.parse(healthData) : {
        lastSuccessfulAuth: 0,
        failureCount: 0
      }

      if (success) {
        health.lastSuccessfulAuth = Date.now()
        health.failureCount = 0
      } else {
        health.failureCount++
        health.lastFailureTimestamp = Date.now()
      }

      localStorage.setItem(SESSION_HEALTH_KEY, JSON.stringify(health))
    } catch (error) {
      console.error('Failed to update session health:', error)
    }
  }

  // Check if session is healthy
  isSessionHealthy(): boolean {
    try {
      const healthData = localStorage.getItem(SESSION_HEALTH_KEY)
      if (!healthData) return true

      const health: SessionHealth = JSON.parse(healthData)

      // Consider unhealthy if more than 3 failures in a row
      if (health.failureCount > 3) return false

      // Consider unhealthy if last success was more than 1 hour ago
      const hourInMs = 60 * 60 * 1000
      if (Date.now() - health.lastSuccessfulAuth > hourInMs) return false

      return true
    } catch {
      return true
    }
  }

  // Get session diagnostics (for debugging)
  getSessionDiagnostics(): any {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      const health = localStorage.getItem(SESSION_HEALTH_KEY)

      return {
        hasStoredSession: !!stored,
        sessionVersion: stored ? JSON.parse(stored).version : null,
        sessionAge: stored ? Date.now() - JSON.parse(stored).timestamp : null,
        health: health ? JSON.parse(health) : null,
        retryAttempts: this.retryAttempts,
        isRecovering: this.isRecovering,
        deploymentId: this.getDeploymentId()
      }
    } catch (error) {
      return { error: 'Failed to get diagnostics', details: error }
    }
  }
}

// Add deployment ID to window
declare global {
  interface Window {
    __DEPLOYMENT_ID__: string
  }
}

// Set deployment ID on load (this could be injected during build)
if (typeof window !== 'undefined') {
  window.__DEPLOYMENT_ID__ = `deploy_${Date.now()}`
}

export const sessionRecovery = SessionRecoveryManager.getInstance()