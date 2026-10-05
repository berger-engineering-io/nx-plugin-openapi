---
title: update-spec Executor
description: Reference for the update-spec executor that refreshes committed OpenAPI specs from a URL
---

# update-spec Executor

The `update-spec` executor downloads OpenAPI specification(s) from a URL and writes them into file(s) in your workspace.

The committed spec file is the **source of truth** for `generate-api`. The URL is only used to refresh that file on demand. This keeps builds offline, deterministic and cacheable: `generate-api` never talks to the network, and spec changes show up as reviewable diffs.

## Usage

```bash
# refresh the committed spec
nx run <project>:update-spec

# CI: fail if the remote spec differs from the committed one
nx run <project>:update-spec --check
```

## Basic Configuration

```json title="project.json"
{
  "targets": {
    "update-spec": {
      "executor": "@nx-plugin-openapi/core:update-spec",
      "cache": false,
      "options": {
        "url": "https://petstore3.swagger.io/api/v3/openapi.json",
        "specPath": "apps/my-app/openapi.json"
      }
    },
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/my-app/openapi.json",
        "outputPath": "libs/api-client/src"
      }
    }
  }
}
```

:::caution
- Always set `"cache": false` on the `update-spec` target. Its output depends on a remote server, which Nx cannot hash.
- Do **not** add `update-spec` to the `dependsOn` of `generate-api` (or `build`). Otherwise every build hits the network and becomes non-deterministic. Run `update-spec` explicitly and commit the result.
:::

## Behavior

- The file is only written when its content changed. Each spec logs one of: `created`, `updated`, `is up to date`.
- Parent directories are created as needed.
- A non-OK HTTP response (e.g. `401`, `404`) fails the target with the status code.

## Options

### `url`

- **Type:** `string`
- **Description:** Remote spec URL (single spec). Requires `specPath`. Mutually exclusive with `urls`.

### `urls`

- **Type:** `Record<string, string>`
- **Description:** Map of name to remote spec URL (multiple specs). Requires `specPaths` and/or a `specPath` directory.

### `specPath`

- **Type:** `string`
- **Description:** With `url`: the target file. With `urls`: a target directory; each spec is written to `<specPath>/<name><ext>`, where `<ext>` is taken from the URL path (`.json`, `.yaml`, `.yml`) and defaults to `.json`.

Paths are relative to the workspace root; absolute paths are allowed.

### `specPaths`

- **Type:** `Record<string, string>`
- **Description:** With `urls`: explicit target file per name. Takes precedence over the `specPath` directory.

### `headers`

- **Type:** `Record<string, string>`
- **Description:** HTTP request headers, e.g. for authentication. Values support `${ENV_VAR}` substitution so secrets are never committed. A referenced but unset variable fails the target before any request is made.

```json
{
  "headers": {
    "Authorization": "Bearer ${API_SPEC_TOKEN}"
  }
}
```

### `check`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Do not write anything. Fails if the remote spec differs from the committed file (or the file is missing). Use in CI for drift detection.

### `format`

- **Type:** `"raw" | "json"`
- **Default:** `"raw"`
- **Description:**
  - `raw`: keep the response exactly as fetched (works for JSON and YAML).
  - `json`: parse the response as JSON and re-serialize it with 2-space indentation and a trailing newline. Use this when the server returns minified JSON to keep diffs readable and stable. Fails for non-JSON responses.

`check` compares the formatted content, so use the same `format` for updating and checking.

## Multiple Specs

```json title="project.json"
{
  "targets": {
    "update-spec": {
      "executor": "@nx-plugin-openapi/core:update-spec",
      "cache": false,
      "options": {
        "urls": {
          "users": "https://api.example.com/users/openapi.json",
          "orders": "https://api.example.com/orders/openapi.yaml"
        },
        "specPath": "apps/my-app/specs",
        "headers": { "Authorization": "Bearer ${API_SPEC_TOKEN}" }
      }
    }
  }
}
```

This writes `apps/my-app/specs/users.json` and `apps/my-app/specs/orders.yaml`.

## CI Drift Detection

```bash
API_SPEC_TOKEN=*** nx run my-app:update-spec --check
```

The target fails with a clear message if any remote spec differs from its committed file.
