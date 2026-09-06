import * as cheerio from "cheerio";
import { logSecurityEvent } from "../security/logger";

export interface LinkMetadata {
  url: string;
  title: string;
  description?: string;
  domain: string;
  favicon?: string;
  image?: string;
}

/**
 * Validates whether a hostname points to a private, loopback, or cloud metadata address.
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Strip brackets from IPv6
  const cleanHost = host.replace(/^\[|\]$/g, "");

  if (
    cleanHost === "localhost" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".internal") ||
    cleanHost === "metadata.google.internal" ||
    cleanHost === "169.254.169.254" ||
    cleanHost === "0.0.0.0" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "::1" ||
    cleanHost === "::"
  ) {
    return true;
  }

  // IPv4 range checks
  const ipv4Parts = cleanHost.split(".");
  if (ipv4Parts.length === 4 && ipv4Parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = ipv4Parts.map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 (loopback)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & AWS/GCP metadata)
    if (a === 0) return true;
  }

  // IPv6 checks (fe80:: link local, fc00::/7 unique local)
  if (cleanHost.startsWith("fe80:") || cleanHost.startsWith("fc00:") || cleanHost.startsWith("fd")) {
    return true;
  }

  return false;
}

export async function extractLinkMetadata(urlStr: string): Promise<LinkMetadata> {
  let validUrl = urlStr.trim();

  // If input contains a URI scheme, ensure it is strictly HTTP or HTTPS
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(validUrl)) {
    if (!/^https?:\/\//i.test(validUrl)) {
      logSecurityEvent({
        event: "SSRF_ATTEMPT",
        details: { url: validUrl, reason: "Disallowed protocol" },
      });
      throw new Error("Only HTTP and HTTPS URLs are permitted");
    }
  } else {
    // Bare domain without scheme
    validUrl = "https://" + validUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(validUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Protocol enforcement
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    logSecurityEvent({
      event: "SSRF_ATTEMPT",
      details: { url: validUrl, reason: "Disallowed protocol" },
    });
    throw new Error("Only HTTP and HTTPS URLs are permitted");
  }

  // SSRF prevention: reject private/local hostnames
  if (isPrivateOrLocalHost(parsed.hostname)) {
    logSecurityEvent({
      event: "SSRF_ATTEMPT",
      details: { url: validUrl, hostname: parsed.hostname },
    });
    throw new Error("Access to local or private network addresses is restricted");
  }

  const domain = parsed.hostname.replace(/^www\./, "");
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;

  try {
    let currentUrl = validUrl;
    let response: Response | null = null;
    let redirects = 0;

    // Follow redirects manually to validate each target against SSRF
    while (redirects <= 3) {
      const parsedCurrent = new URL(currentUrl);

      if (parsedCurrent.protocol !== "http:" && parsedCurrent.protocol !== "https:") {
        logSecurityEvent({
          event: "SSRF_ATTEMPT",
          details: { url: currentUrl, reason: "Disallowed protocol in redirect" },
        });
        throw new Error("Only HTTP and HTTPS URLs are permitted");
      }

      if (isPrivateOrLocalHost(parsedCurrent.hostname)) {
        logSecurityEvent({
          event: "SSRF_ATTEMPT",
          details: { url: currentUrl, hostname: parsedCurrent.hostname, reason: "Redirect to private address" },
        });
        throw new Error("Access to local or private network addresses is restricted");
      }

      response = await fetch(currentUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        redirects++;
      } else {
        break;
      }
    }

    if (!response || !response.ok) {
      return {
        url: validUrl,
        title: domain,
        domain,
        favicon: defaultFavicon,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text().trim() ||
      domain;

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    let image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";

    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, validUrl).toString();
      } catch {
        image = "";
      }
    }

    let iconHref =
      $('link[rel="apple-touch-icon"]').attr("href") ||
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href");

    let favicon = defaultFavicon;
    if (iconHref) {
      try {
        favicon = new URL(iconHref, validUrl).toString();
      } catch {
        // keep fallback
      }
    }

    return {
      url: validUrl,
      title: title.slice(0, 200),
      description: description.slice(0, 500),
      domain,
      favicon,
      image,
    };
  } catch (err: any) {
    if (err.message && err.message.includes("restricted")) {
      throw err;
    }
    return {
      url: validUrl,
      title: domain,
      domain,
      favicon: defaultFavicon,
    };
  }
}
