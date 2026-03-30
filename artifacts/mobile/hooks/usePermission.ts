import { useRbacService } from "@/services/rbac";
import { useSessionService } from "@/services/session";
import { useSystemCoreService } from "@/services/system-core";

/**
 * Returns VIEW and EDIT permissions for the current session user on the given screen.
 *
 * Resolution chain:
 *   1. SessionService  → resolves currentSid (the active user)
 *   2. SystemCoreService → resolves profileIds for that user (central profile registry)
 *   3. RbacService     → checks those profileIds against per-MS entitlement mappings
 *
 * currentSid === null → bypass mode, both permissions default to true (no session set).
 * Loading in progress → both permissions default to true (avoids flash of access-denied).
 */
export function usePermission(screenKey: string): {
  canView: boolean;
  canEdit: boolean;
  loading: boolean;
} {
  const { currentSid, loading: sessionLoading }   = useSessionService();
  const { getProfilesForUser, loading: coreLoading } = useSystemCoreService();
  const { hasPermission, loading: rbacLoading }    = useRbacService();

  const loading = sessionLoading || coreLoading || rbacLoading;
  if (loading) return { canView: true, canEdit: true, loading: true };

  // null → bypass (no session configured), array → enforce RBAC
  const profileIds: string[] | null =
    currentSid === null ? null : getProfilesForUser(currentSid);

  return {
    canView: hasPermission(profileIds, screenKey, "VIEW"),
    canEdit: hasPermission(profileIds, screenKey, "EDIT"),
    loading: false,
  };
}
