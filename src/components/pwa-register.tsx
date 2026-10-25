"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Never let a cached production bundle participate in local development.
    // This prevents stale client chunks from hydrating against the current
    // server tree after navigation changes.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        const rootRegistrations = registrations.filter(
          (registration) => registration.scope === `${window.location.origin}/`,
        );
        if (rootRegistrations.length === 0) return;
        await Promise.all(rootRegistrations.map((registration) => registration.unregister()));
        if (navigator.serviceWorker.controller) window.location.reload();
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // The app remains fully usable when service workers are unavailable.
      });
  }, []);

  return null;
}
