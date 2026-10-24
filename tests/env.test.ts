import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env";

describe("parseServerEnv", () => {
  it("accepts a valid postgresql URL", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgresql://user@localhost:5432/db",
    });
    expect(env.DATABASE_URL).toBe("postgresql://user@localhost:5432/db");
  });

  it("accepts a postgres:// URL", () => {
    expect(
      parseServerEnv({ DATABASE_URL: "postgres://user@localhost:5432/db" })
        .DATABASE_URL,
    ).toContain("postgres://");
  });

  it("throws naming DATABASE_URL when it is missing", () => {
    expect(() => parseServerEnv({})).toThrowError(/DATABASE_URL/);
  });

  it("throws for a non-postgres URL", () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: "mysql://user@localhost/db" }),
    ).toThrowError(/DATABASE_URL/);
    expect(() => parseServerEnv({ DATABASE_URL: "not a url" })).toThrowError(
      /DATABASE_URL/,
    );
  });

  it("does not echo the supplied value in the error", () => {
    const secret = "postgres://user:s3cret-pw@host:5432/db";
    try {
      parseServerEnv({ DATABASE_URL: "ftp://example.com/x" });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("ftp://example.com/x");
    }
    try {
      parseServerEnv({ DATABASE_URL: secret.replace("postgres://", "http://") });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("s3cret-pw");
    }
  });
});
