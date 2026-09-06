import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { Note } from "@/lib/db/models/Note";
import { NoteVersion } from "@/lib/db/models/NoteVersion";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess, verifyItemAccess } from "@/lib/auth/permissions";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { createSafeErrorResponse } from "@/lib/security/logger";

const MAX_NOTE_CONTENT_LENGTH = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`note_create_${user.id}_${ip}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    let { title, folderId, content, color, isChecklist, checklistItems, tags } = body;

    // Validate inputs
    const safeTitle = typeof title === "string" ? title.trim().slice(0, 200) : "Untitled Note";
    const safeContent = typeof content === "string" ? content.slice(0, MAX_NOTE_CONTENT_LENGTH) : "";
    let safeColor = "#ffffff";
    if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
      safeColor = color;
    }

    let safeChecklistItems: Array<{ id: string; text: string; checked: boolean }> = [];
    if (Array.isArray(checklistItems)) {
      safeChecklistItems = checklistItems.slice(0, 200).map((c, idx) => ({
        id: typeof c.id === "string" ? c.id.slice(0, 50) : `chk_${idx}`,
        text: typeof c.text === "string" ? c.text.slice(0, 500) : "",
        checked: Boolean(c.checked),
      }));
    }

    let safeTags: string[] = [];
    if (Array.isArray(tags)) {
      safeTags = tags
        .filter((t) => typeof t === "string")
        .map((t) => t.trim().slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .slice(0, 20);
    }

    if (folderId === "root" || folderId === "null" || !folderId) {
      folderId = null;
    } else {
      if (typeof folderId !== "string" || !mongoose.Types.ObjectId.isValid(folderId)) {
        return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
      }
      const auth = await verifyFolderAccess(user.id, user.email, folderId, "editor");
      if (!auth.authorized) {
        return NextResponse.json({ error: "Permission denied for this folder" }, { status: 403 });
      }
    }

    await connectToDatabase();

    // 1. Create parent Item
    const item = await Item.create({
      ownerId: user.id,
      folderId: folderId ? new mongoose.Types.ObjectId(folderId) : null,
      type: "note",
      name: safeTitle || "Untitled Note",
      mimeType: "text/markdown",
      size: safeContent.length,
      tags: safeTags,
    });

    // 2. Create Note document
    const note = await Note.create({
      itemId: item._id,
      contentFormat: "markdown",
      content: safeContent,
      color: safeColor,
      isChecklist: Boolean(isChecklist),
      checklistItems: safeChecklistItems,
      currentVersion: 1,
      tags: safeTags,
    });

    // 3. Create initial NoteVersion (§12)
    await NoteVersion.create({
      noteId: note._id,
      itemId: item._id,
      version: 1,
      content: safeContent,
      checklistItems: safeChecklistItems,
      changeSummary: "Initial note created",
      editedBy: user.id,
      editedAt: new Date(),
    });

    return NextResponse.json({
      item: {
        ...item.toObject(),
        id: item._id.toString(),
        note: {
          ...note.toObject(),
          id: note._id.toString(),
        },
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to create note");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      itemId,
      title,
      content,
      color,
      isChecklist,
      checklistItems,
      tags,
      createRevision,
      changeSummary,
    } = body;

    if (!itemId || typeof itemId !== "string" || !mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
    }

    const auth = await verifyItemAccess(user.id, user.email, itemId, "editor");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    await connectToDatabase();

    const item = auth.resource;
    let note = await Note.findOne({ itemId: item._id });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Update item metadata
    if (title !== undefined && typeof title === "string") {
      item.name = title.trim().slice(0, 200) || "Untitled Note";
    }
    if (tags !== undefined && Array.isArray(tags)) {
      item.tags = tags
        .filter((t) => typeof t === "string")
        .map((t) => t.trim().slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .slice(0, 20);
    }

    if (content !== undefined && typeof content === "string") {
      const safeContent = content.slice(0, MAX_NOTE_CONTENT_LENGTH);
      note.content = safeContent;
      item.size = safeContent.length;
    }

    item.updatedAt = new Date();
    await item.save();

    // Determine version increment
    const currentVersion = note.currentVersion || 1;
    let newVersion = currentVersion;

    if (createRevision) {
      newVersion = currentVersion + 1;
      note.currentVersion = newVersion;

      // Record new revision in NoteVersion (§12)
      await NoteVersion.create({
        noteId: note._id,
        itemId: item._id,
        version: newVersion,
        content: note.content,
        checklistItems: note.checklistItems,
        changeSummary: typeof changeSummary === "string" ? changeSummary.slice(0, 100) : `Revision ${newVersion}`,
        editedBy: user.id,
        editedAt: new Date(),
      });
    }

    if (color !== undefined && typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
      note.color = color;
    }
    if (isChecklist !== undefined) {
      note.isChecklist = Boolean(isChecklist);
    }
    if (checklistItems !== undefined && Array.isArray(checklistItems)) {
      note.checklistItems = checklistItems.slice(0, 200).map((c, idx) => ({
        id: typeof c.id === "string" ? c.id.slice(0, 50) : `chk_${idx}`,
        text: typeof c.text === "string" ? c.text.slice(0, 500) : "",
        checked: Boolean(c.checked),
      }));
    }
    if (tags !== undefined) {
      note.tags = item.tags;
    }

    await note.save();

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
      version: newVersion,
      item: {
        ...item.toObject(),
        id: item._id.toString(),
        note: {
          ...note.toObject(),
          id: note._id.toString(),
        },
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to update note");
  }
}
