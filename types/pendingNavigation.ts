// lib/pendingNavigation.ts
//
// A tiny module-level bridge between notification handlers and routers.
//
// Why this exists:
//   - On cold start, getInitialNotification() resolves AFTER the Stack has
//     mounted and index.tsx has already redirected. We can't navigate from
//     the notification handler directly — index.tsx will replace us.
//     So on cold start we only STORE the intent; index.tsx peeks/consumes it
//     and routes accordingly.
//   - On runtime taps (app already running), index.tsx is unmounted, so we
//     need to BROADCAST the intent to whoever is mounted and listening.
//
// Two writers, two paths. No races.

let pendingChatId: string | null = null;
const listeners = new Set<(id: string) => void>();

/** Cold start: store only. index.tsx will peek/consume it. */
export const setPendingChat = (id: string) => {
  pendingChatId = id;
};

/**
 * Runtime tap: broadcast immediately so a mounted router can navigate.
 * Does NOT store — we don't want index.tsx to re-consume it on a later mount.
 */
export const broadcastPendingChat = (id: string) => {
  listeners.forEach((l) => l(id));
};

/** Non-destructive check. Used by index.tsx to decide splash delay. */
export const peekPendingChat = (): string | null => pendingChatId;

/** One-shot read+clear. Used by index.tsx when it's time to route. */
export const consumePendingChat = (): string | null => {
  const id = pendingChatId;
  pendingChatId = null;
  return id;
};

/** Subscribe to runtime broadcasts. Returns an unsubscribe fn. */
export const onPendingChat = (cb: (id: string) => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};