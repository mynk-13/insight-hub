"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationType } from "@prisma/client";

interface Preference {
  id: string;
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

const TYPE_LABELS: Record<NotificationType, string> = {
  MENTION: "@-Mentions",
  INVITE_ACCEPTED: "Invite Accepted",
  ROLE_CHANGED: "Role Changed",
  ANNOTATION_REPLY: "Annotation Replies",
  ANNOTATION_RESOLVED: "Annotation Resolved",
};

export function NotificationPreferenceCenter() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((d) => setPreferences(d.preferences ?? []))
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(
    async (type: NotificationType, field: "inApp" | "email", value: boolean) => {
      setSaving(`${type}-${field}`);
      setPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, [field]: value } : p)));
      try {
        await fetch("/api/notifications/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, [field]: value }),
        });
      } finally {
        setSaving(null);
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_80px] text-xs font-medium text-muted-foreground px-3 pb-1">
        <span>Notification</span>
        <span className="text-center">In-app</span>
        <span className="text-center">Email</span>
      </div>
      {preferences.map((pref) => (
        <div
          key={pref.type}
          className="grid grid-cols-[1fr_80px_80px] items-center rounded-lg border px-3 py-3"
        >
          <span className="text-sm">{TYPE_LABELS[pref.type]}</span>
          <div className="flex justify-center">
            <Toggle
              checked={pref.inApp}
              disabled={saving === `${pref.type}-inApp`}
              onChange={(v) => update(pref.type, "inApp", v)}
            />
          </div>
          <div className="flex justify-center">
            <Toggle
              checked={pref.email}
              disabled={saving === `${pref.type}-email`}
              onChange={(v) => update(pref.type, "email", v)}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-2">
        You can also unsubscribe from individual email notifications via the link in each email.
      </p>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}
