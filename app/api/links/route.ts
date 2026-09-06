import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess } from "@/lib/auth/permissions";
import { extractLinkMetadata } from "@/lib/utils/linkPreview";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: max 30 saved links per minute
    const ip = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`link_create_${user.id}_${ip}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json();
    let { url, folderId, tags, title: customTitle } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
    }

    const rawUrl = url.trim().slice(0, 1000);
    if (!/^https?:\/\//i.test(rawUrl)) {
      return NextResponse.json({ error: "URL must begin with http:// or https://" }, { status: 400 });
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

    // Scrape link metadata with SSRF defense (§3, §8)
    const meta = await extractLinkMetadata(rawUrl);

    let safeTags: string[] = [];
    if (Array.isArray(tags)) {
      safeTags = tags
        .filter((t) => typeof t === "string")
        .map((t) => t.trim().slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .slice(0, 20);
    }

    const safeTitle = typeof customTitle === "string" && customTitle.trim()
      ? customTitle.trim().slice(0, 200).replace(/[\x00-\x1f\x7f]/g, "")
      : meta.title || meta.domain;

    const item = await Item.create({
      ownerId: user.id,
      folderId: folderId ? new mongoose.Types.ObjectId(folderId) : null,
      type: "link",
      name: safeTitle,
      mimeType: "text/uri-list",
      size: 0,
      thumbnailUrl: meta.image || meta.favicon,
      tags: safeTags,
      metadata: {
        url: meta.url,
        domain: meta.domain,
        title: meta.title,
        description: meta.description,
        favicon: meta.favicon,
        image: meta.image,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        ...item.toObject(),
        id: item._id.toString(),
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to save link");
  }
}
