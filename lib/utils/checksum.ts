import crypto from "crypto";

export function calculateBufferChecksum(buffer: Buffer): string {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

export async function calculateStreamChecksum(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}
