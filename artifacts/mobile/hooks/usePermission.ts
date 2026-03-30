import { useRbacService } from "@/services/rbac";
import { useSessionService } from "@/services/session";

/**
 * Returns VIEW and EDIT permissions for the current session user on the given screen.
 *
 * screenKey examples:
 *   "borrower.profile", "inquiry.notes", "loan.terms", "documents.main", …
 *
 * If no session is active (currentSid === null), both permissions default to true
 * so existing screens are unaffected until a user is selected in Admin.
 *
 * If loading is still in progress, permissions default to true to avoid a flash
 * of the access-denied screen during initial mount.
 */
export function usePermission(screenKey: string): {
  canView: boolean;
  canEdit: boolean;
  loading: boolean;
} {
  const { currentSid, loading: sessionLoading } = useSessionService();
  const { hasPermission, loading: rbacLoading }  = useRbacService();

  const loading = sessionLoading || rbacLoading;

  if (loading) return { canView: true, canEdit: true, loading: true };

  return {
    canView:  hasPermission(currentSid, screenKey, "VIEW"),
    canEdit:  hasPermission(currentSid, screenKey, "EDIT"),
    loading:  false,
  };
}
