import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connect";
import { User } from "../lib/db/models/User";
import { Folder } from "../lib/db/models/Folder";
import { Item } from "../lib/db/models/Item";
import { Note } from "../lib/db/models/Note";
import { Permission } from "../lib/db/models/Permission";
import { verifyFolderAccess, verifyItemAccess } from "../lib/auth/permissions";
import { extractLinkMetadata } from "../lib/utils/linkPreview";
import { validateFileSignature, sanitizeFilename, sanitizeSvg } from "../lib/security/fileValidation";
import { checkRateLimit } from "../lib/security/rateLimit";
import { getStorageProvider } from "../lib/storage";

async function runSecurityTests() {
  console.log("🔒 Starting Adversarial Security Verification Suite...\n");

  await connectToDatabase();

  // Clean up any previous test artifacts
  await User.deleteMany({ email: /sec-.*@vault\.test/ });
  await Folder.deleteMany({ name: /SecFolder/ });
  await Item.deleteMany({ name: /SecItem/ });

  // 1. Create two isolated test users (Victim and Attacker)
  console.log("1. Setting up multi-tenant test accounts...");
  const victim = await User.create({
    name: "Victim User",
    email: "sec-victim@vault.test",
  });
  const attacker = await User.create({
    name: "Attacker User",
    email: "sec-attacker@vault.test",
  });
  console.log("   ✓ Created Victim and Attacker accounts.\n");

  // 2. IDOR Protection (Horizontal Privilege Escalation)
  console.log("2. Testing Insecure Direct Object Reference (IDOR) defense...");
  const victimFolder = await Folder.create({
    ownerId: victim._id,
    name: "SecFolder Confidential Financials",
  });
  const victimItem = await Item.create({
    ownerId: victim._id,
    folderId: victimFolder._id,
    type: "file",
    name: "SecItem TaxReturns.pdf",
    mimeType: "application/pdf",
    size: 1024,
  });

  // Attacker tries to read victim's folder
  const attackerFolderAuth = await verifyFolderAccess(attacker._id.toString(), attacker.email, victimFolder._id);
  if (attackerFolderAuth.authorized) {
    throw new Error("IDOR VULNERABILITY: Attacker was able to access Victim's private folder!");
  }
  console.log("   ✓ Attacker blocked from accessing Victim folder (403 Forbidden).");

  // Attacker tries to read victim's item
  const attackerItemAuth = await verifyItemAccess(attacker._id.toString(), attacker.email, victimItem._id);
  if (attackerItemAuth.authorized) {
    throw new Error("IDOR VULNERABILITY: Attacker was able to access Victim's private item!");
  }
  console.log("   ✓ Attacker blocked from accessing Victim item (403 Forbidden).\n");

  // 3. Privilege Escalation Defense (Editor cannot grant permissions)
  console.log("3. Testing Privilege Escalation defense...");
  // Victim invites attacker as "viewer"
  await Permission.create({
    resourceType: "folder",
    resourceId: victimFolder._id,
    userId: attacker._id,
    userEmail: attacker.email,
    role: "viewer",
  });

  const viewerAuth = await verifyFolderAccess(attacker._id.toString(), attacker.email, victimFolder._id, "editor");
  if (viewerAuth.authorized) {
    throw new Error("PRIVILEGE ESCALATION: Viewer was granted editor permissions!");
  }
  console.log("   ✓ Viewer role correctly denied editor access.");

  // Elevate to editor
  await Permission.findOneAndUpdate(
    { resourceType: "folder", resourceId: victimFolder._id, userEmail: attacker.email },
    { role: "editor" }
  );

  // Check that editor is NOT owner
  const editorAuth = await verifyFolderAccess(attacker._id.toString(), attacker.email, victimFolder._id, "owner");
  if (editorAuth.authorized) {
    throw new Error("PRIVILEGE ESCALATION: Editor was granted owner permissions!");
  }
  console.log("   ✓ Editor role strictly prevented from claiming Owner privileges.\n");

  // 4. Trash Isolation (Soft-deleted data must be inaccessible)
  console.log("4. Testing Trash data isolation...");
  victimItem.isTrash = true;
  victimItem.trashedAt = new Date();
  await victimItem.save();

  // Victim attempts normal read on trashed item
  const trashedRead = await verifyItemAccess(victim._id.toString(), victim.email, victimItem._id, "viewer");
  if (trashedRead.authorized) {
    throw new Error("DATA EXPOSURE: Trashed item is accessible via normal read endpoint!");
  }
  console.log("   ✓ Soft-deleted item is inaccessible via standard read/download endpoints.\n");

  // 5. SSRF Defense
  console.log("5. Testing Server-Side Request Forgery (SSRF) defense...");
  const dangerousUrls = [
    "http://127.0.0.1:27017",
    "http://localhost:3000",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/admin",
    "http://192.168.1.1",
    "file:///etc/passwd",
    "gopher://localhost:11211",
  ];

  for (const dangerousUrl of dangerousUrls) {
    let blocked = false;
    try {
      await extractLinkMetadata(dangerousUrl);
    } catch (err: any) {
      blocked = true;
    }
    if (!blocked) {
      throw new Error(`SSRF VULNERABILITY: ${dangerousUrl} was not blocked!`);
    }
  }
  console.log(`   ✓ All ${dangerousUrls.length} internal/private/SSRF targets successfully blocked.\n`);

  // 6. Magic Bytes & MIME Spoofing Defense
  console.log("6. Testing File Signature / Magic Bytes validation...");
  // Attacker uploads a Windows executable disguised as a PNG
  const fakePngBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00This is malicious binary code", "binary");
  const checkFakePng = validateFileSignature(fakePngBuffer, "image/png", ".png");
  if (checkFakePng.isValid) {
    throw new Error("FILE UPLOAD VULNERABILITY: PE executable disguised as PNG was allowed!");
  }
  console.log("   ✓ Executable binary disguised as image/png blocked.");

  // Attacker uploads an executable with .exe extension
  const checkExe = validateFileSignature(Buffer.from("dummy"), "application/octet-stream", ".exe");
  if (checkExe.isValid) {
    throw new Error("FILE UPLOAD VULNERABILITY: .exe extension was allowed!");
  }
  console.log("   ✓ Executable extension (.exe) strictly prohibited.\n");

  // 7. Stored XSS Prevention in SVG Sanitization
  console.log("7. Testing SVG Stored XSS sanitization...");
  const maliciousSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('XSS')</script><circle cx="50" cy="50" r="40" onload="alert(1)" onclick="alert(2)"/><a href="javascript:alert(3)">Click</a></svg>`,
    "utf-8"
  );
  const cleanSvg = sanitizeSvg(maliciousSvg).toString("utf-8");
  if (cleanSvg.includes("<script") || cleanSvg.includes("onload=") || cleanSvg.includes("onclick=") || cleanSvg.includes("javascript:")) {
    throw new Error("XSS VULNERABILITY: SVG sanitization failed to strip malicious script handlers!");
  }
  console.log("   ✓ Malicious scripts, event handlers, and javascript: links stripped from SVG.\n");

  // 8. Filename Sanitization (Path Traversal)
  console.log("8. Testing Filename sanitization & path traversal defense...");
  const dirtyFilenames = [
    "../../../../etc/passwd",
    "..\\..\\windows\\system32\\calc.exe",
    "test\0nullbyte.png",
    "   normal.pdf   ",
  ];
  for (const dirty of dirtyFilenames) {
    const clean = sanitizeFilename(dirty);
    if (clean.includes("..") || clean.includes("\0") || clean.includes("/") || clean.includes("\\")) {
      throw new Error(`PATH TRAVERSAL VULNERABILITY: Filename ${dirty} sanitized poorly: ${clean}`);
    }
  }
  console.log("   ✓ All path traversal sequences and null bytes sanitized.\n");

  // 9. Rate Limiting
  console.log("9. Testing In-Memory Rate Limiting...");
  const testKey = `test_limit_${Date.now()}`;
  let allowedCount = 0;
  for (let i = 0; i < 15; i++) {
    const res = checkRateLimit(testKey, 5, 10000);
    if (res.allowed) allowedCount++;
  }
  if (allowedCount !== 5) {
    throw new Error(`RATE LIMIT FAILURE: Expected 5 allowed requests, got ${allowedCount}`);
  }
  console.log("   ✓ Rate limiter successfully capped burst requests at threshold (5 allowed, 10 rejected).\n");

  // 10. Local Storage Path Traversal Defense
  console.log("10. Testing LocalStorageProvider path traversal defense...");
  const storage = getStorageProvider();
  let traversalBlocked = false;
  try {
    await storage.download("../../../package.json");
  } catch {
    traversalBlocked = true;
  }
  if (!traversalBlocked) {
    throw new Error("PATH TRAVERSAL VULNERABILITY: Storage provider allowed downloading files outside storage directory!");
  }
  console.log("   ✓ Storage provider rejected directory traversal identifier.\n");

  // Clean up test records
  await User.deleteMany({ email: /sec-.*@vault\.test/ });
  await Folder.deleteMany({ name: /SecFolder/ });
  await Item.deleteMany({ name: /SecItem/ });
  await Permission.deleteMany({ userEmail: /sec-.*@vault\.test/ });

  console.log("🛡️ ALL 10 ADVERSARIAL SECURITY TESTS PASSED SUCCESSFULLY! The system is hardened.\n");
  process.exit(0);
}

runSecurityTests().catch((err) => {
  console.error("❌ Security test failed:", err);
  process.exit(1);
});
