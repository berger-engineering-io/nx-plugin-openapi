---
title: Inferred Targets
description: Infer generate and update-spec targets plus the generated libs from a client definition, without project.json
---

# Inferred Targets

`@nx-plugin-openapi/core` ships an Nx plugin (`createNodesV2`, "Project Crystal") that reads **client definition** files named `openapi-client.json`. From each of them it infers:

- a client project with a cached `generate` target
- an `update-spec` target if the definition has a `url`
- the `types`, `api` and `core` libs if `split` is configured

You don't need a `project.json`.

## Register the Plugin

```json title="nx.json"
{
  "plugins": [
    {
      "plugin": "@nx-plugin-openapi/core/plugin",
      "options": {
        "generateTargetName": "generate",
        "updateSpecTargetName": "update-spec",
        "tags": [],
        "dependentTargets": ["build", "typecheck"]
      }
    }
  ]
}
```

All options are optional:

| Option                 | Default                  | Description                                         |
| ---------------------- | ------------------------ | --------------------------------------------------- |
| `generateTargetName`   | `generate`               | Name of the inferred generate target                |
| `updateSpecTargetName` | `update-spec`            | Name of the inferred update-spec target             |
| `tags`                 | `[]`                     | Tags added to every inferred project                |
| `dependentTargets`     | `["build", "typecheck"]` | Targets of the split libs that run `generate` first |

## Client Definition

Use one `openapi-client.json` per client. All paths are relative to the file.

```json title="libs/shared/petstore/openapi-client.json"
{
  "$schema": "../../../node_modules/@nx-plugin-openapi/core/src/plugin/openapi-client.schema.json",
  "name": "petstore",
  "spec": "petstore.openapi.json",
  "url": "https://petstore3.swagger.io/api/v3/openapi.json",
  "headers": { "Authorization": "Bearer ${PETSTORE_TOKEN}" },
  "generator": "openapi-tools",
  "generatorOptions": { "generatorName": "typescript-angular" },
  "split": {
    "aliases": {
      "types": "@acme/petstore-types",
      "api": "@acme/petstore-api",
      "core": "@acme/petstore-core"
    }
  },
  "tags": ["scope:shared"]
}
```

| Field              | Required     | Description                                                            |
| ------------------ | ------------ | ---------------------------------------------------------------------- |
| `name`             | no           | Client name. Project names derive from it. Default: the directory name |
| `spec`             | yes          | Local spec file. This committed file is the source of truth            |
| `url`              | no           | Remote spec URL. Adds the `update-spec` target                         |
| `headers`          | no           | Request headers for `update-spec`. Supports `${ENV_VAR}`               |
| `format`           | no           | `raw` (default) or `json`, see [update-spec](/reference/update-spec/)  |
| `generator`        | no           | `openapi-tools` (default), `hey-api` or a custom plugin package        |
| `generatorOptions` | no           | Options passed to the generator plugin                                 |
| `output`           | no           | Generator output dir. Default: `src`, or `generated` with `split`      |
| `split.aliases`    | with `split` | Import alias of the `types`, `api` and `core` libs                     |
| `split.targetRoot` | no           | Dir receiving the libs. Default: the definition dir                    |
| `tags`             | no           | Tags added to all projects of this client, e.g. `scope:shared`         |

## Inferred Projects

For the definition above, `nx show projects` lists:

| Project          | Root                         | Tags                         |
| ---------------- | ---------------------------- | ---------------------------- |
| `petstore`       | `libs/shared/petstore`       | `scope:shared`               |
| `petstore-types` | `libs/shared/petstore/types` | `scope:shared`, `type:types` |
| `petstore-api`   | `libs/shared/petstore/api`   | `scope:shared`, `type:api`   |
| `petstore-core`  | `libs/shared/petstore/core`  | `scope:shared`, `type:util`  |

Without `split`, the client project holds the generated code itself and gets the `type:api` tag.

:::caution
Every lib needs at least one file tracked by git (e.g. a `README.md` in `types/`, `api/` and `core/`). Nx can't hash tasks of a project without files, and the generated `src` dirs are usually gitignored.
:::

Use the fixed `type:*` tags in `@nx/enforce-module-boundaries`. Models (`type:types`) import nothing, `core` (`type:util`) imports models, and services (`type:api`) import both:

```js title="eslint.config.js"
depConstraints: [
  { sourceTag: 'type:types', onlyDependOnLibsWithTags: ['type:types'] },
  { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:types', 'type:util'] },
  { sourceTag: 'type:api', onlyDependOnLibsWithTags: ['type:types', 'type:util', 'type:api'] },
];
```

### `generate`

Runs the [generate-api executor](/reference/generate-api/) with `cache: true`:

- **inputs:** the definition file and the spec file (plus `generatorOptions.configFile` if set). The executor hasher also hashes the spec content.
- **outputs:** the `output` dir and, with `split`, the `src` dir of every lib.
- with `split`, the built-in [split post-processor](/reference/generate-api/#built-in-split) runs after generation.

```bash
nx run petstore:generate
```

### `update-spec`

Runs the [update-spec executor](/reference/update-spec/) with `cache: false`. It downloads `url` into `spec`. It is **not** a dependency of `generate`. Refresh the spec on purpose and commit it.

```bash
nx run petstore:update-spec          # write the spec
nx run petstore:update-spec --check  # fail if the remote spec differs (CI)
```

### Generate Before Build

Every split lib has an implicit dependency on the client project. Its `dependentTargets` (default `build` and `typecheck`) depend on the client's `generate` target, so `nx build petstore-api` generates first.

The plugin adds this dependency with the `'...'` spread, so it keeps the `dependsOn` that other plugins infer, e.g. `^build`:

```json
{ "dependsOn": ["...", { "projects": ["petstore"], "target": "generate" }] }
```

:::note

- Register `@nx-plugin-openapi/core/plugin` **after** plugins that infer `build` or `typecheck`. Later plugins win when Nx merges targets.
- If no other plugin defines the target, it becomes a no-op that only runs `generate`.
- The `'...'` spread requires a recent Nx version (tested with Nx 23).
  :::

## Merging with project.json

Nx merges inferred projects with existing `project.json` files of the same root. Explicit configuration wins:

- A `project.json` in the client dir can override or extend the `generate` target. If it sets a `name`, the libs reference that name.
- A `project.json` in a lib dir (e.g. for a `build` target) is merged with the inferred tags and dependencies.

The split post-processor only writes into `<lib>/src`. Files such as `project.json` or `tsconfig.json` next to it are kept.
