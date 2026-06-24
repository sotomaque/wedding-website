import { describe, expect, it } from "bun:test";
import { isAllowedUploadUrl } from "@/lib/uploadthing-url";

describe("isAllowedUploadUrl", () => {
  it("accepts UploadThing https URLs", () => {
    expect(isAllowedUploadUrl("https://utfs.io/f/abc.jpg")).toBe(true);
    expect(isAllowedUploadUrl("https://my-app.ufs.sh/f/abc.jpg")).toBe(true);
  });

  it("rejects non-UploadThing and SSRF-style hosts", () => {
    expect(isAllowedUploadUrl("http://169.254.169.254/latest/meta-data/")).toBe(
      false,
    );
    expect(isAllowedUploadUrl("http://localhost:6379/")).toBe(false);
    expect(isAllowedUploadUrl("https://evil.example/x.jpg")).toBe(false);
    // host suffix tricks must not pass
    expect(isAllowedUploadUrl("https://utfs.io.evil.example/x")).toBe(false);
    expect(isAllowedUploadUrl("https://evilufs.sh/x")).toBe(false);
  });

  it("rejects non-https schemes and garbage", () => {
    expect(isAllowedUploadUrl("http://utfs.io/f/abc.jpg")).toBe(false);
    expect(isAllowedUploadUrl("ftp://utfs.io/f/abc.jpg")).toBe(false);
    expect(isAllowedUploadUrl("not a url")).toBe(false);
    expect(isAllowedUploadUrl("")).toBe(false);
  });
});
