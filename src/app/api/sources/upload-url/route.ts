import { auth } from "@/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/shared/db";
import { checkSourceQuota } from "@/lib/modules/ingestion";
import { canPerform } from "@/lib/modules/workspace/permission";
import { z } from "zod";
import { NextResponse } from "next/server";
import type { SourceType } from "@prisma/client";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/markdown": "MARKDOWN",
  "text/plain": "MARKDOWN",
};

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const TokenPayloadSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
});

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = TokenPayloadSchema.safeParse(JSON.parse(clientPayload ?? "{}"));
        if (!payload.success) throw new Error("Invalid payload");

        const { workspaceId, userId } = payload.data;

        // Verify membership and permission
        const member = await db.member.findUnique({
          where: { workspaceId_userId: { workspaceId, userId } },
          select: { role: true },
        });
        if (!member || !canPerform(member.role, "sources:upload")) {
          throw new Error("Forbidden");
        }

        await checkSourceQuota(workspaceId);

        return {
          allowedContentTypes: Object.keys(ALLOWED_TYPES),
          maximumSizeInBytes: MAX_SIZE_BYTES,
          tokenPayload: JSON.stringify(payload.data),
        };
      },
      onUploadCompleted: async (body) => {
        const { blob, tokenPayload } = body;
        const payload = TokenPayloadSchema.parse(JSON.parse(tokenPayload ?? "{}"));
        const { workspaceId, userId, filename, mimeType } = payload;
        const sourceType = ALLOWED_TYPES[mimeType] ?? "PDF";

        await db.source.create({
          data: {
            workspaceId,
            createdById: userId,
            title: filename.replace(/\.[^.]+$/, ""),
            type: sourceType as SourceType,
            blobKey: blob.url,
            mimeType,
            status: "PENDING",
          },
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message === "Forbidden" ? 403 : message.includes("limit") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
