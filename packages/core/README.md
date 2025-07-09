<div align="center">

# `@tapsioss/danger`

An extensible framework for integrating [Danger.js](https://danger.systems/js/)
declaratively.

</div>

<hr />

## Installation

Install the package using the following command:

```bash
pnpm add @tapsioss/danger
```

## Features

- **Plugin-based Architecture**: Add custom validation logic using plugins.
- **Centralized Data Store**: Share arbitrary data across plugins during a
  Danger run.
- **Streamlined Dangerfile Creation**: Simplify your `dangerfile.ts` with a
  client-based approach.

### Client Fields

| Field Name      | Type                                                                                                                                                                                                            | Description                                                                    |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `gitlab`        | [`GitLabDSL`](<https://www.google.com/search?q=%5Bhttps://github.com/danger/danger-js/blob/main/source/dsl/GitLabDSL.ts%5D(https://github.com/danger/danger-js/blob/main/source/dsl/GitLabDSL.ts)>)             | GitLab-specific information for the current merge request.                     |
| `github`        | [`GitHubDSL`](<https://www.google.com/search?q=%5Bhttps://github.com/danger/danger-js/blob/main/source/dsl/GitHubDSL.ts%5D(https://github.com/danger/danger-js/blob/main/source/dsl/GitHubDSL.ts)>)             | GitHub-specific information for the current pull request.                      |
| `git`           | [`GitDSL`](<https://www.google.com/search?q=%5Bhttps://github.com/danger/danger-js/blob/main/source/dsl/GitDSL.ts%5D(https://github.com/danger/danger-js/blob/main/source/dsl/GitDSL.ts)>)                      | Git-related information such as modified, created, and deleted files.          |
| `results`       | [`DangerResults`](<https://www.google.com/search?q=%5Bhttps://github.com/danger/danger-js/blob/main/source/dsl/DangerResults.ts%5D(https://github.com/danger/danger-js/blob/main/source/dsl/DangerResults.ts)>) | The shared Danger results object used to store warnings, fails, messages, etc. |
| `data`          | `Record<PropertyKey, unknown>`                                                                                                                                                                                  | Arbitrary data storage shared across plugins for this Danger run.              |
| `modifiedFiles` | `string[]`                                                                                                                                                                                                      | List of files that have been modified in the current merge request.            |
| `createdFiles`  | `string[]`                                                                                                                                                                                                      | List of files that have been newly created in the current merge request.       |
| `deletedFiles`  | `string[]`                                                                                                                                                                                                      | List of files that have been deleted in the current merge request.             |

### Client Methods

| Method Name | Type                                                                | Description                                                     |
| :---------- | :------------------------------------------------------------------ | :-------------------------------------------------------------- |
| `warn`      | `(msg: string, file?: string, line?: number) => void`               | Function to mark a warning in the Danger output.                |
| `fail`      | `(msg: string, file?: string, line?: number) => void`               | Function to mark a failure in the Danger output.                |
| `message`   | `(msg: string, file?: string, line?: number) => void`               | Function to add a general message to the Danger report.         |
| `markdown`  | `(msg: string, file?: string, line?: number) => void`               | Function to add markdown output to the Danger report.           |
| `use`       | `<Option>(plugin: PluginRuntime<Option>, options?: Option) => this` | Registers a plugin to the DangerClient.                         |
| `analyze`   | `() => Promise<DangerResults>`                                      | Analyzes the merge request by executing all registered plugins. |

### Registering Plugins

You can add plugins using the `use` method on the `DangerClient` instance.

#### Defining Custom Plugins

The `createPlugin` helper ensures a consistent structure and typing for your
Danger plugins.

```typescript
import { createPlugin } from "@tapsioss/danger";

/**
 * A plugin that warns if the merge request is too big.
 *
 * @example
 * // Registering the plugin:
 * // dangerClient.use(mergeRequestSizePlugin, { size: 100 });
 */
export const mergeRequestSizePlugin = createPlugin<{ size?: number }>(
  (client, options) => {
    const threshold = options?.size || 200;
    const changedFiles = [
      ...client.git.modified_files,
      ...client.git.created_files,
    ];
    if (changedFiles.length > threshold) {
      client.warn(
        `The merge request is too big (${changedFiles.length} files changed). Consider breaking it into multiple merge requests.`,
      );
    }
  },
);
```

> [!TIP] Use the `createPlugin` helper for strongly typed plugins and
> `PluginRuntime` type (exported from `@tapsioss/danger`) for inline plugin
> definitions if you prefer.

### Analysis

After adding plugins to the client, you can run the plugins sequentially using
the `analyze` method.

```ts
const dangerClient = new DangerClient(danger);

dangerClient
  // Use a custom plugin defined in a separate file or using createPlugin:
  .use(sayHelloToUserPlugin, { id: "bob" })
  // Define an inline plugin directly:
  .use(mergeRequestSizePlugin, { size: 100 });

// Run analysis
const results = await dangerClient.analyze();

// You can access the result of the danger run.
if (results.fails.length > 0) {
  dangerClient.markdown("You have some failures! Please fix them.");
}
```

## Setting Up Danger in projects

### Install `danger`

You need to import some variables and functions from the `danger` package to
pass them to our `DangerClient` class.

```bash
pnpm add danger
```

> [!WARNING] Use Danger.js version `11.3.1` if your Node.js version is less than
> `16`.

### Create the `dangerfile.ts`

Create a `dangerfile.ts` at the root of your project. Here's an example:

```typescript
import { danger } from "danger";
import { DangerClient } from "@tapsioss/danger";

(async function tasks() {
  const dangerClient = new DangerClient(danger);

  // Register your plugins here
  dangerClient
    // Example: Using a custom plugin
    // .use(mergeRequestSizePlugin, { size: 100 })
    // Example: Defining an inline plugin
    .use<{ targetFileName: string }>(
      (client, { targetFileName }) => {
        if (
          client.createdFiles.includes(targetFileName) &&
          !client.createdFiles.includes("CHANGELOG.md")
        ) {
          client.fail(
            `You have added ${targetFileName}. Please update the CHANGELOG.md.`,
          );
        }
      },
      { targetFileName: "new-feature.ts" },
    );

  // Run analysis
  const results = await dangerClient.analyze();

  // Optionally, react to the results
  if (results.fails.length > 0) {
    dangerClient.markdown("---");
    dangerClient.markdown("## 🚨 Action Required: Failures Detected 🚨");
    dangerClient.markdown(
      "The following issues must be resolved before this merge request can be merged:",
    );
    results.fails.forEach(f => dangerClient.markdown(`- ${f.message}`));
    dangerClient.markdown("---");
  }
})();
```

## Setting Up the CI

Danger needs specific environment variables in your CI/CD pipeline to work
properly.

### GitHub

- `DANGER_GITHUB_API_TOKEN`: Create a GitHub Personal Access Token with
  appropriate repository permissions (e.g., `repo` scope for private
  repositories) and save it as `DANGER_GITHUB_API_TOKEN` in your repository
  secrets.

### GitLab

Danger requires the following variables in your CI to work properly:

- `DANGER_GITLAB_API_TOKEN`: Create a GitLab Personal Access Token with `api`
  scope and `Developer` role (or higher) and save it as
  `DANGER_GITLAB_API_TOKEN` in your repository/group CI/CD variables.
- `DANGER_GITLAB_HOST`: The host of your GitLab instance, for example:
  `https://gitlab.com` or `https://your-on-premise-gitlab.com`.
- `DANGER_GITLAB_API_BASE_URL`: The base URL of GitLab APIs, for example:
  `https://gitlab.com/api/v4` or `https://your-on-premise-gitlab.com/api/v4`.

Some other
[predefined CI/CD variables](https://docs.gitlab.com/ci/variables/predefined_variables/)
are also required for setting up Danger in CI. Ensure these are available to
your Danger job:

- `CI_MERGE_REQUEST_IID`
- `CI_PROJECT_PATH`
- `CI_PROJECT_ID`
- `GITLAB_CI` (should be set to `true` or similar by GitLab CI)
