import {
  type DangerDSLType,
  type DangerResults,
  type GitDSL,
  type GitHubDSL,
  type GitLabDSL,
} from "danger";
import { type PluginRuntime } from "./types.ts";

declare let results: DangerResults;
declare const warn: (msg: string, file?: string, line?: number) => void;
declare const fail: (msg: string, file?: string, line?: number) => void;
declare const message: (msg: string, file?: string, line?: number) => void;
declare const markdown: (msg: string, file?: string, line?: number) => void;

/**
 * A class that provides a modular way to enhance GitLab merge request validation
 * by integrating plugins and automating common tasks such as marking drafts,
 * notifying assignees/reviewers, and managing merge request titles.
 *
 * @see https://danger.systems/js/
 */
class DangerClient {
  /**
   * GitLab-specific information for the current merge request.
   */
  public readonly gitlab: GitLabDSL;

  /**
   * GitHub-specific information for the current pull request.
   */
  public readonly github: GitHubDSL;

  /**
   * Git-related information such as modified, created, and deleted files.
   */
  public readonly git: GitDSL;

  /**
   * The shared Danger results object used to store warnings, fails, messages, etc.
   */
  public readonly results: DangerResults;

  /**
   * Function to mark a failure in the Danger output.
   */
  public readonly fail: typeof fail;

  /**
   * Function to mark a warning in the Danger output.
   */
  public readonly warn: typeof warn;

  /**
   * Function to add markdown output to the Danger report.
   */
  public readonly markdown: typeof markdown;

  /**
   * Function to add a general message to the Danger report.
   */
  public readonly message: typeof message;

  /**
   * List of files that have been modified in the current merge request.
   */
  public readonly modifiedFiles: string[];

  /**
   * List of files that have been newly created in the current merge request.
   */
  public readonly createdFiles: string[];

  /**
   * List of files that have been deleted in the current merge request.
   */
  public readonly deletedFiles: string[];

  /**
   * Arbitrary data storage shared across plugins for this Danger run.
   */
  public readonly data: Record<PropertyKey, unknown>;

  /**
   * List of registered plugins and their associated options.
   * Used to apply custom validation logic.
   */
  private readonly _plugins: Array<[PluginRuntime, object]> = [];

  /**
   * Creates an instance of DangerClient.
   * Initializes context properties and file changes for processing.
   *
   * @param danger - The Danger context for the current merge request.
   */
  constructor(danger: DangerDSLType) {
    this.gitlab = danger.gitlab;
    this.git = danger.git;
    this.github = danger.github;
    this.fail = fail;
    this.warn = warn;
    this.results = results;
    this.markdown = markdown;
    this.message = message;

    this.modifiedFiles = this.git.modified_files;
    this.createdFiles = this.git.created_files;
    this.deletedFiles = this.git.deleted_files;

    this.data = {};
  }

  /**
   * Returns the list of registered plugins for the current Danger run.
   * Primarily exposed for testing or debugging purposes. Direct manipulation of this list is discouraged;
   * plugins should be added using the {@link use} method to ensure consistent behavior.
   *
   * @returns The internal list of registered plugins and their options.
   */
  public get plugins() {
    return this._plugins;
  }

  /**
   * Registers a plugin to the DangerClient.
   * Enables modular validation logic for merge requests.
   *
   * @param plugin - The plugin function to register.
   * @param options - Optional configuration for the plugin.
   * @returns The current DangerClient instance for chaining.
   */
  public use<Option extends object = object>(
    plugin: PluginRuntime<Option>,
    options?: Option,
  ): this {
    this._plugins.push([plugin as PluginRuntime, options ?? {}]);

    return this;
  }

  /**
   * Analyzes the merge request using registered plugins.
   * Executes all plugins with their associated options.
   *
   * @returns The updated Danger results after plugin analysis.
   */
  public async analyze(): Promise<DangerResults> {
    for (const [method, pluginOption] of this._plugins) {
      await method(this, pluginOption);
    }

    return this.results;
  }
}

export default DangerClient;
