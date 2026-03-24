/**
 * TOOL CONFIGURATION
 *
 * Update these values for each new tool.
 * This is the single source of truth for tool-specific settings.
 */

export const TOOL_CONFIG = {
  /** Display name of the tool (e.g. "JSON Formatter") */
  name: 'Regex Tester',

  /** Short tagline (e.g. "Format and validate JSON instantly") */
  tagline: 'Test and debug regular expressions instantly',

  /** Full URL of the deployed tool */
  url: 'https://free-regex-tester.codama.dev/',

  /** localStorage key prefix to avoid collisions between tools */
  storagePrefix: 'codama-regex-tester',
} as const
