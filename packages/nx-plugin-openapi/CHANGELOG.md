## 0.3.0 (2025-08-14)


### 🚀 Features

- **generate-api:** add support for multiple inputSpec files ([8ba101a](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/8ba101a))

- **add-generate-api-target:** add support for custom target name ([f2edba0](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/f2edba0))


### 🩹 Fixes

- **docs:** gif not displayed correctly ([92ef9aa](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/92ef9aa))
- **tests:** fix TypeScript errors in hasher tests ([fb83ef8](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/fb83ef8))


### ❤️  Thank You

- Michael Be

## 0.1.0 (2025-07-04)


### 🚀 Features

- **plugin:** create executor to generate angular client from local openapi.json ([75c7ad6](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/75c7ad6))

- **plugin:** when remote url is given generate api from remote and calculate hash for caching ([f0b0cd6](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/f0b0cd6))

- **plugin:** compare hash of cached file and remote when fetching OpenApi spec again ([92073fa](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/92073fa))

- **plugin:** option to specify a custom directory to store metadata files ([a411661](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/a411661))

- **plugin:** wip integrate caching when remote url is used ([c0b30e4](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/c0b30e4))

- **plugin:** add init generator to support nx add command ([16d744a](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/16d744a))

- **plugin:** add generator to add the generate-api target to a nx project ([a0a41d8](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/a0a41d8))

- **plugin:** install openapitools/generator-cli if not present when run init ([9a578b8](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/9a578b8))

- **plugin:** support most of the CLI arguments ([3e66fb0](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/3e66fb0))


### 🩹 Fixes

- use better matcher ([bc7aea0](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/bc7aea0))

- **plugin:** remove non-standard key from schema.json ([f4b7fb4](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/f4b7fb4))

- **plugin:** tests fixed ([8b0db9c](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/8b0db9c))

- **plugin:** add outputs when adding project-target ([48a16bb](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/48a16bb))

- **plugin:** remove peerdependency ([47aad2c](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/47aad2c))

- **plugin:** pass package correctly to parseVersion ([dbe58c2](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/dbe58c2))

- **plugin:** return empty promise when no package.json found ([ae27a58](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/ae27a58))


### ❤️  Thank You

- Michael Be
- Michael Berger
