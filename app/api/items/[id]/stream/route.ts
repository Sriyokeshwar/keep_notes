import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyItemAccess } from "@/lib/auth/permissions";
import { getStorageProvider } from "@/lib/storage";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid item identifier" }, { status: 400 });
    }

    const auth = await verifyItemAccess(user.id, user.email, id, "viewer");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    const item = auth.resource;
    if (!item.storageFileId) {
      return NextResponse.json({ error: "Media file not found" }, { status: 404 });
    }

    const rangeHeader = req.headers.get("range");
    let range: { start: number; end: number } | undefined = undefined;

    if (rangeHeader) {
      const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
      if (match) {
        const start = parseInt(match[1], 10);
        let end = match[2] ? parseInt(match[2], 10) : item.size ? item.size - 1 : 0;

        // Prevent Integer Overflow or Range Denial of Service
        if (!isNaN(start) && start >= 0 && (item.size === 0 || start < item.size)) {
          if (isNaN(end) || end < start || (item.size > 0 && end >= item.size)) {
            end = item.size > 0 ? item.size - 1 : start;
          }
          range = { start, end };
        }
      }
    }

    const storage = getStorageProvider(user.accessToken, user.id);
    const streamRes = await storage.getStream(item.storageFileId, range);

    const webStream = new ReadableStream({
      start(controller) {
        streamRes.stream.on("data", (chunk) => controller.enqueue(chunk));
        streamRes.stream.on("end", () => controller.close());
        streamRes.stream.on("error", (err) => controller.error(err));
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", streamRes.contentType || item.mimeType || "application/octet-stream");
    headers.set("Content-Length", streamRes.contentLength.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");

    if (streamRes.contentRange) {
      headers.set("Content-Range", streamRes.contentRange);
    }

    return new NextResponse(webStream, {
      status: streamRes.statusCode,
      headers,
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Stream error");
  }
}
