import {
  type DangerDSLType,
  type GitDSL,
  type GitHubDSL,
  type GitLabDSL,
} from "danger";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { createPlugin } from "./create-plugin.ts"; // Adjust the import path as necessary
import DangerClient from "./DangerClient.ts";
import type { PluginRuntime } from "./types.ts"; // Import for type definition if needed

describe("createPlugin", () => {
  let client: DangerClient;
  let danger: DangerDSLType;

  type DangerGlobalScope = typeof globalThis & {
    fail: Mock;
    warn: Mock;
    message: Mock;
    markdown: Mock;
    results: object;
  };

  beforeEach(() => {
    (globalThis as DangerGlobalScope).fail = vi.fn();
    (globalThis as DangerGlobalScope).warn = vi.fn();
    (globalThis as DangerGlobalScope).message = vi.fn();
    (globalThis as DangerGlobalScope).markdown = vi.fn();
    (globalThis as DangerGlobalScope).results = {};

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

  it("should return the provided plugin function unchanged", () => {
    const mockPluginFn = vi.fn<PluginRuntime<{ someOption?: boolean }>>(
      (client, options) => {
        client.message("This is a test plugin.");
        if (options && options.someOption) {
          client.warn(`Option received: ${options.someOption}`);
        }
      },
    );

    // Call createPlugin with the mock function
    const resultPlugin = createPlugin(mockPluginFn);

    // Assert that the function returned by createPlugin is strictly the same
    // as the function that was passed in. This covers the 'return pluginFn;' line.
    expect(resultPlugin).toBe(mockPluginFn);
    expect(resultPlugin).toBeInstanceOf(Function);
  });
});
