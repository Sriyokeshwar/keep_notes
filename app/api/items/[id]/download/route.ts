import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Note } from "@/lib/db/models/Note";
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

    // Verify user has viewer access (and ensure item is not in trash)
    const auth = await verifyItemAccess(user.id, user.email, id, "viewer");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    const item = auth.resource;
    const safeFilename = encodeURIComponent(item.name.replace(/["\r\n]/g, "_"));

    // Handle note download as Markdown
    if (item.type === "note") {
      await connectToDatabase();
      const note = await Note.findOne({ itemId: item._id });
      let content = `# ${item.name}\n\n`;
      if (note?.isChecklist && note.checklistItems?.length) {
        content += note.checklistItems
          .map((c) => `- [${c.checked ? "x" : " "}] ${c.text}`)
          .join("\n");
      } else {
        content += note?.content || "";
      }

      const headers = new Headers();
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Content-Disposition", `attachment; filename="${safeFilename}.md"; filename*=UTF-8''${safeFilename}.md`);
      return new NextResponse(content, { headers });
    }

    if (!item.storageFileId) {
      return NextResponse.json({ error: "Item has no stored file" }, { status: 404 });
    }

    const storage = getStorageProvider(user.accessToken);
    const downloadRes = await storage.download(item.storageFileId);

    // Convert node readable stream to web readable stream for Next.js response
    const webStream = new ReadableStream({
      start(controller) {
        downloadRes.stream.on("data", (chunk) => controller.enqueue(chunk));
        downloadRes.stream.on("end", () => controller.close());
        downloadRes.stream.on("error", (err) => controller.error(err));
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", downloadRes.mimeType || item.mimeType || "application/octet-stream");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    headers.set("Content-Disposition", `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    if (downloadRes.size) {
      headers.set("Content-Length", downloadRes.size.toString());
    }

    return new NextResponse(webStream, { headers });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Download failed");
  }
}
