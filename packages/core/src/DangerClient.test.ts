import type { DangerDSLType, GitDSL, GitHubDSL, GitLabDSL } from "danger";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import DangerClient from "./DangerClient.ts";

describe("DangerClient", () => {
  let client: DangerClient;
  let danger: DangerDSLType;

  type DangerGlobalScope = typeof globalThis & {
    fail: Mock;
    warn: Mock;
    message: Mock;
    markdown: Mock;
    results: {
      warnings: object;
    };
  };

  beforeEach(() => {
    (globalThis as DangerGlobalScope).fail = vi.fn();
    (globalThis as DangerGlobalScope).warn = vi.fn();
    (globalThis as DangerGlobalScope).message = vi.fn();
    (globalThis as DangerGlobalScope).markdown = vi.fn();
    (globalThis as DangerGlobalScope).results = {
      warnings: {},
    };

    danger = {
      git: {
        modified_files: ["file1.ts", "file2.ts"],
        created_files: ["newFile.ts"],
        deleted_files: ["deletedFile.ts"],
      } as GitDSL,
      gitlab: {} as GitLabDSL,
      github: {} as GitHubDSL,
    } as DangerDSLType;

    client = new DangerClient(danger);

    // Spy on the client's methods to assert their calls
    vi.spyOn(client, "warn").mockImplementation(() => {});
    vi.spyOn(client, "fail").mockImplementation(() => {});
    vi.spyOn(client, "message").mockImplementation(() => {});
    vi.spyOn(client, "markdown").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initializes properties correctly", () => {
    expect(client.gitlab).toBe(danger.gitlab);
    expect(client.github).toBe(danger.github);
    expect(client.git).toBe(danger.git);
    expect(client.modifiedFiles).toEqual(["file1.ts", "file2.ts"]);
    expect(client.createdFiles).toEqual(["newFile.ts"]);
    expect(client.deletedFiles).toEqual(["deletedFile.ts"]);
    expect(client.data).toEqual({});
    // Also check that the direct methods are assigned
    expect(client.fail).toBeDefined();
    expect(client.warn).toBeDefined();
    expect(client.message).toBeDefined();
    expect(client.markdown).toBeDefined();
    expect(client.results).toBe((globalThis as DangerGlobalScope).results);
  });

  it("should allow plugins to modify data", async () => {
    client.use(c => {
      c.data.a = 1;
    });

    expect(client.plugins).toHaveLength(1);

    client
      .use(c => {
        c.data.b = 2;
      })
      .use(c => {
        c.data.c = 3;
      });

    expect(client.plugins).toHaveLength(3);

    await client.analyze();

    expect(client.data).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should execute plugins in order", async () => {
    const calls: string[] = [];

    client
      .use(() => {
        calls.push("first");
      })
      .use(() => {
        calls.push("second");
      });

    await client.analyze();

    expect(calls).toEqual(["first", "second"]);
  });

  it("should execute plugins after calling analyze", async () => {
    let analyzed = false;

    client.use(() => {
      analyzed = true;
    });

    expect(analyzed).toBe(false);

    await client.analyze();

    expect(analyzed).toBe(true);
  });

  it("should chain use() calls", () => {
    const returned = client.use(() => {});

    expect(returned).toBe(client);
  });

  it("should isolate data between instances", async () => {
    const otherClient = new DangerClient(danger);

    client.use(c => {
      c.data.foo = "bar";
    });

    await client.analyze();

    expect(client.data.foo).toBe("bar");
    expect(otherClient.data.foo).toBeUndefined();
  });

  // --- New tests for 100% coverage ---

  it("should return the list of registered plugins via the getter", () => {
    client.use(() => {});
    expect(client.plugins).toHaveLength(1);
    expect(client.plugins[0]?.[0]).toBeInstanceOf(Function);
  });

  it("should return DangerResults after analysis", async () => {
    (globalThis as DangerGlobalScope).results.warnings = [
      { message: "test warn" },
    ];

    const returnedResults = await client.analyze();

    expect(returnedResults).toBe((globalThis as DangerGlobalScope).results);
    expect(returnedResults.warnings).toEqual([{ message: "test warn" }]);
  });

  it("should correctly call warn through client instance from a plugin", async () => {
    client.use(c => {
      c.warn("Test warning message", "path/to/file.ts", 10);
    });
    await client.analyze();
    expect(client.warn).toHaveBeenCalledTimes(1);
    expect(client.warn).toHaveBeenCalledWith(
      "Test warning message",
      "path/to/file.ts",
      10,
    );
  });

  it("should correctly call fail through client instance from a plugin", async () => {
    client.use(c => {
      c.fail("Test failure message", "path/to/other.ts", 20);
    });
    await client.analyze();
    expect(client.fail).toHaveBeenCalledTimes(1);
    expect(client.fail).toHaveBeenCalledWith(
      "Test failure message",
      "path/to/other.ts",
      20,
    );
  });

  it("should correctly call message through client instance from a plugin", async () => {
    client.use(c => {
      c.message("Test message content", "path/to/another.ts", 30);
    });
    await client.analyze();
    expect(client.message).toHaveBeenCalledTimes(1);
    expect(client.message).toHaveBeenCalledWith(
      "Test message content",
      "path/to/another.ts",
      30,
    );
  });

  it("should correctly call markdown through client instance from a plugin", async () => {
    client.use(c => {
      c.markdown("### Test Markdown\n\n- item 1", "path/to/readme.md", 40);
    });
    await client.analyze();
    expect(client.markdown).toHaveBeenCalledTimes(1);
    expect(client.markdown).toHaveBeenCalledWith(
      "### Test Markdown\n\n- item 1",
      "path/to/readme.md",
      40,
    );
  });

  it("should pass options to plugins", async () => {
    const pluginMock = vi.fn();
    const options = { someOption: "value" };

    client.use(pluginMock, options);
    await client.analyze();
    expect(pluginMock).toHaveBeenCalledTimes(1);
    expect(pluginMock).toHaveBeenCalledWith(client, options);
  });
});
