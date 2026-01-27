## 0.1.0 (2026-01-27)


### 🚀 Features

- comprehensive code review improvements and refactoring ([2d8010e](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/2d8010e))

- replace custom logger with nx/devkit logger ([9d23bc1](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/9d23bc1))

- add built-in hey-openapi generator plugin and core loader mapping to support @hey-api/openapi-ts ([c55282c](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/c55282c))

- **core:** introduce plugin architecture and OpenAPI plugin\n\n- Add core registry, loader, base, and errors\n- Add core generate-api executor and generators\n- Implement @nx-plugin-openapi/plugin-openapi (OpenAPI Tools) plugin\n- Wire packages and exports without changing legacy package ([f70ff9d](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/f70ff9d))

- **core:** add demo target, unit tests, and lint-safe core utilities\n\n- Add demo target using @nx-plugin-openapi/core:generate-api\n- Add core executor unit tests and fix typing\n- Harden plugin loader and auto-installer for lint rules ([9bb2270](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/9bb2270))

- **core:** make plugin loader workspace-aware with root fallback and update executor to pass root ([18bb00e](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/18bb00e))

- **core:** integrate auto-installer with plugin loader for seamless plugin installation ([54c150f](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/54c150f))

- **core:** improve logging for plugin auto-installation ([69169e8](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/69169e8))


### 🩹 Fixes

- improve auto installer to short-circuit on empty package arrays ([#59](https://github.com/berger-engineering-io/nx-plugin-openapi/pull/59))

- **core:** bracket access for error.code in plugin loader ([dd9fc9d](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/dd9fc9d))

- **core:** set default target name to generate-api ([07226a3](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/07226a3))

- **core:** updateBuildTargetDependsOn when adding generate-api target ([87e362e](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/87e362e))

- **core:** do not install openapitools-generator-cli when init generator is executed ([dc5be52](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/dc5be52))

- **core:** prevent workspace deletion in cleanOutput method (Fixes #57) ([#60](https://github.com/berger-engineering-io/nx-plugin-openapi/pull/60), [#57](https://github.com/berger-engineering-io/nx-plugin-openapi/issues/57))

- **core:** show correct error description when detecting dangerous path pattern ([9c5da8e](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/9c5da8e))

- **core:** make built-in plugin fallback robust and use it for demo generation via hey-openapi\n\n- Correct fallback path to dist src/index.js and support CJS require + file URL import\n- Switch demo target to 'hey-openapi' with a valid client option\n- Add @hey-api/openapi-ts to workspace devDependencies to enable runtime codegen ([72016bc](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/72016bc))

- **core:** default target name ([30a4420](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/30a4420))

- **core:** detect package manager properly using @nx/devkit ([e631837](https://github.com/berger-engineering-io/nx-plugin-openapi/commit/e631837))


### ❤️  Thank You

- Mac Mini
- Michael Be
- Michael Berger