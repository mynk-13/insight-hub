"use client";

import * as React from "react";
import { FREE_MODELS, PRO_MODELS } from "@/lib/modules/rag/model-definitions";
import type { ModelId, ModelTier } from "@/lib/modules/rag/types";

type Props = {
  value: ModelId;
  tier: ModelTier;
  onChange: (model: ModelId) => void;
  disabled?: boolean;
};

export function ModelSelector({ value, tier, onChange, disabled = false }: Props) {
  const models = tier === "PRO" ? PRO_MODELS : FREE_MODELS;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ModelId)}
      disabled={disabled}
      aria-label="Select AI model"
      className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
