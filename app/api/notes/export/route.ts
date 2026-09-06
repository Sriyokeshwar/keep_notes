import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { Note } from "@/lib/db/models/Note";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyItemAccess } from "@/lib/auth/permissions";
import { jsPDF } from "jspdf";
import { createSafeErrorResponse } from "@/lib/security/logger";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const format = (searchParams.get("format") || "md").toLowerCase();

    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
    }

    const auth = await verifyItemAccess(user.id, user.email, itemId, "viewer");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    await connectToDatabase();
    const item = auth.resource;
    const note = await Note.findOne({ itemId: item._id });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const title = item.name || "Untitled Note";
    let textBody = note.content || "";
    if (note.isChecklist && note.checklistItems?.length) {
      textBody += "\n" + note.checklistItems
        .map((c) => `[${c.checked ? "x" : " "}] ${c.text}`)
        .join("\n");
    }

    const safeFilename = encodeURIComponent(title.replace(/["\r\n]/g, "_"));
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");

    if (format === "md") {
      const mdContent = `# ${title}\n\n*Created: ${new Date(item.createdAt).toLocaleString()}*\n\n${textBody}\n`;
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("Content-Disposition", `attachment; filename="${safeFilename}.md"; filename*=UTF-8''${safeFilename}.md`);
      return new NextResponse(mdContent, { headers });
    }

    if (format === "txt") {
      const txtContent = `${title}\n\n${textBody}\n`;
      headers.set("Content-Type", "text/plain; charset=utf-8");
      headers.set("Content-Disposition", `attachment; filename="${safeFilename}.txt"; filename*=UTF-8''${safeFilename}.txt`);
      return new NextResponse(txtContent, { headers });
    }

    if (format === "html") {
      // Escape HTML entities to prevent Stored XSS (§3)
      const safeHtmlTitle = escapeHtml(title);
      const safeHtmlBody = escapeHtml(textBody);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeHtmlTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 24px; }
    .content { white-space: pre-wrap; font-size: 1.05rem; }
  </style>
</head>
<body>
  <h1>${safeHtmlTitle}</h1>
  <div class="meta">Exported from Personal Knowledge Vault &bull; ${escapeHtml(new Date().toLocaleDateString())}</div>
  <div class="content">${safeHtmlBody}</div>
</body>
</html>`;
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
      headers.set("Content-Disposition", `attachment; filename="${safeHtmlTitle}.html"; filename*=UTF-8''${safeHtmlTitle}.html`);
      return new NextResponse(htmlContent, { headers });
    }

    if (format === "pdf") {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(20);
      doc.text(title.slice(0, 80), 40, 50);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exported from Personal Knowledge Vault • ${new Date().toLocaleDateString()}`, 40, 70);

      doc.setDrawColor(200);
      doc.line(40, 80, 555, 80);

      doc.setFontSize(11);
      doc.setTextColor(30);
      const splitText = doc.splitTextToSize(textBody, 515);
      doc.text(splitText, 40, 105);

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${safeFilename}.pdf`);
      return new NextResponse(pdfBuffer, { headers });
    }

    return NextResponse.json({ error: "Invalid format. Supported: md, txt, html, pdf" }, { status: 400 });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Export failed");
  }
}
