import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeHtmlEntities, isRemoteImageUrl, rehostImageToStorage } from "./image-url";

const OUR_IMAGE = "https://x.supabase.co/storage/v1/object/public/event-images/abc.jpg";

describe("decodeHtmlEntities", () => {
  it("unescapes the ampersands that break signed CDN URLs", () => {
    expect(decodeHtmlEntities("https://cdn.test/a.jpg?x=1&amp;oh=abc&amp;oe=123")).toBe(
      "https://cdn.test/a.jpg?x=1&oh=abc&oe=123",
    );
  });

  it("leaves normal text alone", () => {
    expect(decodeHtmlEntities("Dendy Pavillion, Brighton Beach")).toBe("Dendy Pavillion, Brighton Beach");
  });
});

describe("isRemoteImageUrl", () => {
  it("treats already-uploaded images as ours", () => {
    expect(isRemoteImageUrl(OUR_IMAGE)).toBe(false);
  });

  it("treats third-party images as remote", () => {
    expect(isRemoteImageUrl("https://scontent.cdninstagram.com/a.jpg?oe=1")).toBe(true);
  });

  it("ignores empty, relative and data URLs", () => {
    expect(isRemoteImageUrl(null)).toBe(false);
    expect(isRemoteImageUrl("")).toBe(false);
    expect(isRemoteImageUrl("/images/a.jpg")).toBe(false);
    expect(isRemoteImageUrl("data:image/png;base64,abc")).toBe(false);
  });
});

describe("rehostImageToStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies a remote image into storage and returns the new URL", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-1" });
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      blob: async () => new Blob(["bytes"], { type: "image/jpeg" }),
    }));
    const upload = vi.fn(async () => "https://ours/uuid-1.jpg");

    await expect(rehostImageToStorage("https://cdn.test/a.jpg?x=1&amp;y=2", upload)).resolves.toBe(
      "https://ours/uuid-1.jpg",
    );
    expect(upload).toHaveBeenCalledWith(expect.any(Blob), "uuid-1.jpg");
  });

  it("keeps the original URL when the fetch fails", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false }));
    const upload = vi.fn(async () => "https://ours/new.jpg");

    await expect(rehostImageToStorage("https://cdn.test/a.jpg", upload)).resolves.toBe("https://cdn.test/a.jpg");
    expect(upload).not.toHaveBeenCalled();
  });

  it("keeps the original URL when the upload fails", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-2" });
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      blob: async () => new Blob(["bytes"], { type: "image/png" }),
    }));
    const upload = vi.fn(async () => {
      throw new Error("storage refused");
    });

    await expect(rehostImageToStorage("https://cdn.test/a.png", upload)).resolves.toBe("https://cdn.test/a.png");
  });

  it("does not re-upload images that are already ours", async () => {
    const upload = vi.fn(async () => "https://ours/should-not-happen.jpg");

    await expect(rehostImageToStorage(OUR_IMAGE, upload)).resolves.toBe(OUR_IMAGE);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects non-image responses", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-3" });
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      blob: async () => new Blob(["<html>"], { type: "text/html" }),
    }));
    const upload = vi.fn(async () => "https://ours/nope.jpg");

    await expect(rehostImageToStorage("https://cdn.test/page", upload)).resolves.toBe("https://cdn.test/page");
    expect(upload).not.toHaveBeenCalled();
  });
});
