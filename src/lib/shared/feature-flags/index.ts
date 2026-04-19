import "server-only";

// Default flag values. Override per-flag at runtime via env var:
//   FEATURE_FLAG_RAG_ENABLED=true
//   FEATURE_FLAG_BILLING_ENABLED=false
const FLAGS = {
  ragEnabled: true,
  billingEnabled: false,
  analyticsEnabled: false,
  urlIngestionEnabled: true,
  ocrEnabled: true,
  multiGatewayBilling: false,
} as const;

export type Flag = keyof typeof FLAGS;

export function isEnabled(flag: Flag): boolean {
  const envKey = `FEATURE_FLAG_${flag.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) return envVal === "true" || envVal === "1";
  return FLAGS[flag];
}
