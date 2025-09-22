import { useAuth } from '../context/AuthContext'
import { useViewAs } from '../context/ViewAsContext'

/**
 * Hook that returns the effective user ID - either the ViewAs user or the actual user
 * This is used to fetch data as if you were the viewed-as user
 */
export const useViewAsUser = () => {
  const { user } = useAuth()
  const { viewAsUser, isViewingAs } = useViewAs()

  // If viewing as another user, return their user_id
  if (isViewingAs && viewAsUser) {
    return {
      userId: viewAsUser.user_id,
      playerId: viewAsUser.id,
      friendlyName: viewAsUser.friendly_name,
      isBetaTester: viewAsUser.is_beta_tester,
      isAdmin: viewAsUser.is_admin,
      isSuperAdmin: viewAsUser.is_super_admin,
      isViewingAs: true
    }
  }

  // Otherwise return the actual user
  return {
    userId: user?.id || null,
    playerId: null, // Will need to be fetched
    friendlyName: null,
    isBetaTester: false,
    isAdmin: false,
    isSuperAdmin: false,
    isViewingAs: false
  }
}