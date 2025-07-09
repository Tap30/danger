import { type PluginRuntime } from "./types.ts";

/**
 * Helper to create a typed Danger plugin for .
 * Ensures consistent structure and typing.
 *
 * @example
 * // a plugin that warn if the merge request is too big.
 * type Options = { size: number };
 * export const mergeRequestSizePlugins = createPlugin<Options>((client, options) => {
 *   const threshold = options?.size || 200;
 *   const changedFiles = [...client.git.modified_files, ...client.git.created_files];
 *   if (changedFiles.length > threshold) {
 *     client.warn(
 *       "The merge request is too big. Break it into multiple merge requests",
 *     );
 *   }
 * });
 */
export const createPlugin = <Options extends Record<PropertyKey, unknown>>(
  pluginFn: PluginRuntime<Options>,
): PluginRuntime<Options> => {
  return pluginFn;
};
