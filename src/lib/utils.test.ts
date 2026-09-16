import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redirectPathFromLocations, safeRedirectPath } from "./utils.ts";

describe("safeRedirectPath", () => {
  it("rejects external URLs, protocol-relative, and javascript", () => {
    assert.equal(safeRedirectPath("https://evil.example"), "/");
    assert.equal(safeRedirectPath("//evil.example"), "/");
    assert.equal(safeRedirectPath("javascript:alert(1)"), "/");
  });

  it("keeps in-app paths and drops auth routes", () => {
    assert.equal(safeRedirectPath("/settings"), "/settings");
    assert.equal(safeRedirectPath("/notebooks/new"), "/notebooks/new");
    assert.equal(safeRedirectPath("/login"), "/");
    assert.equal(safeRedirectPath("/register?x=1"), "/");
  });
});

describe("redirectPathFromLocations", () => {
  it("prefers the browser path when the router still reports /", () => {
    assert.equal(redirectPathFromLocations("/", "/settings"), "/settings");
    assert.equal(
      redirectPathFromLocations("/", "/notebooks/abc"),
      "/notebooks/abc",
    );
  });

  it("falls back to the router path when the browser path is empty", () => {
    assert.equal(redirectPathFromLocations("/settings", ""), "/settings");
    assert.equal(redirectPathFromLocations("/settings", null), "/settings");
  });

  it("still refuses auth routes and open redirects", () => {
    assert.equal(redirectPathFromLocations("/", "/login"), "/");
    assert.equal(redirectPathFromLocations("/", "https://evil.example"), "/");
  });
});
