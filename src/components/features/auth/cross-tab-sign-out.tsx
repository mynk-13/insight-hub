"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

const CHANNEL_NAME = "insighthub:auth";

type AuthMessage = { type: "SIGN_OUT" };

// Broadcasts a sign-out event to all open tabs via BroadcastChannel.
export function broadcastSignOut(): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: "SIGN_OUT" } satisfies AuthMessage);
  channel.close();
}

// Mount this once in the root layout. Listens for sign-out events from other
// tabs and triggers client-side session teardown automatically.
export function CrossTabSignOutListener() {
  const { status } = useSession();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<AuthMessage>) => {
      if (event.data?.type === "SIGN_OUT" && status === "authenticated") {
        signOut({ redirect: true, callbackUrl: "/auth/signin" });
      }
    };

    return () => channel.close();
  }, [status]);

  return null;
}
