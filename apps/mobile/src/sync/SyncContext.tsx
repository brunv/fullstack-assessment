import NetInfo from "@react-native-community/netinfo";
import { Q } from "@nozbe/watermelondb";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import Toast from "react-native-toast-message";

import { jobsCollection, postsCollection } from "../db";
import { syncDatabase } from "../db/sync";

export type SyncStatus = "synced" | "pending" | "syncing";

type TriggerOptions = {
  /** Background triggers (create/delete, app-foreground, connectivity
   * restored) skip silently when offline — that's an expected state, not an
   * error, and is already visible via the pending/cloud-slash indicators.
   * The manual sync button is the one place a "no connection" toast makes
   * sense, since it's a direct user action. */
  silent?: boolean;
};

type SyncContextValue = {
  status: SyncStatus;
  /** True only while a *user-initiated* (non-silent) sync is in flight —
   * i.e. pull-to-refresh. Background triggers (create/delete, app-foreground,
   * connectivity-restored) also flip `status` to "syncing", but must not
   * spin a refresh control the user never pulled. */
  isRefreshing: boolean;
  triggerSync: (options?: TriggerOptions) => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [jobsPending, setJobsPending] = useState(0);
  const [postsPending, setPostsPending] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const jobsSub = jobsCollection
      .query(Q.where("_status", Q.notEq("synced")))
      .observeCount()
      .subscribe(setJobsPending);
    const postsSub = postsCollection
      .query(Q.where("_status", Q.notEq("synced")))
      .observeCount()
      .subscribe(setPostsPending);
    return () => {
      jobsSub.unsubscribe();
      postsSub.unsubscribe();
    };
  }, []);

  const hasPending = jobsPending > 0 || postsPending > 0;
  const status: SyncStatus = isSyncing
    ? "syncing"
    : hasPending
      ? "pending"
      : "synced";

  const triggerSync = useCallback((options: TriggerOptions = {}) => {
    NetInfo.fetch().then((state) => {
      const isOnline = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      if (!isOnline) {
        if (!options.silent) {
          Toast.show({
            type: "info",
            text1: "No internet connection",
            text2: "Changes will sync automatically once you're back online.",
          });
        }
        return;
      }

      const isManual = !options.silent;
      setIsSyncing(true);
      if (isManual) setIsRefreshing(true);
      syncDatabase()
        .catch((err) => {
          Toast.show({
            type: "error",
            text1: "Sync failed",
            text2: err instanceof Error ? err.message : "Please try again.",
          });
        })
        .finally(() => {
          setIsSyncing(false);
          if (isManual) setIsRefreshing(false);
        });
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") triggerSync({ silent: true });
      },
    );
    return () => subscription.remove();
  }, [triggerSync]);

  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      if (isOnline && wasOffline) triggerSync({ silent: true });
      wasOffline = !isOnline;
    });
    return unsubscribe;
  }, [triggerSync]);

  return (
    <SyncContext.Provider value={{ status, isRefreshing, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
}
