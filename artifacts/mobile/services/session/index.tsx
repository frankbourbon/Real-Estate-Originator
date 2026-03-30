import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_session_v1";

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Lightweight session service.
 * Stores the SID of the "active" user for RBAC permission checks.
 * null means no session is set → RBAC checks are bypassed (all access).
 * This is NOT authentication; it is a demo-mode user switcher.
 */
const [SessionServiceProvider, useSessionService] = createContextHook(() => {
  const [currentSid, setCurrentSidState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      setCurrentSidState(raw ?? null);
      setLoading(false);
    });
  }, []);

  const setCurrentSid = useCallback(async (sid: string | null) => {
    setCurrentSidState(sid);
    if (sid === null) {
      await AsyncStorage.removeItem(KEY);
    } else {
      await AsyncStorage.setItem(KEY, sid);
    }
  }, []);

  return { currentSid, loading, setCurrentSid };
});

export { SessionServiceProvider, useSessionService };
