import "server-only";
import { createHash } from "crypto";

export function computeContentHash(content: string | Buffer): string {
  return createHash("sha256")
    .update(typeof content === "string" ? content : content)
    .digest("hex");
}
