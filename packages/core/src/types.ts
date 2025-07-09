import type DangerClient from "./DangerClient.ts";

export type PluginRuntime<Option extends object = object> = (
  client: DangerClient,
  options?: Option,
) => void | Promise<void>;
