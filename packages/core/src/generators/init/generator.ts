import {
  addDependenciesToPackageJson,
  formatFiles,
  logger,
  readNxJson,
  runTasksInSerial,
  Tree,
  updateNxJson,
  GeneratorCallback,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { log } from '../utils/log';
import { getPackageVersion } from '../utils/check-package-version';

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  const packageJsonPath = 'package.json';
  if (!tree.exists(packageJsonPath)) {
    logger.error(
      log(
        `Could not find ${packageJsonPath}. Please run this generator in a valid Nx workspace.`
      )
    );
    return Promise.resolve();
  }

  const packageJson = JSON.parse(tree.read(packageJsonPath, 'utf-8'));
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const tasks: GeneratorCallback[] = [];
  const packageName = '@openapitools/openapi-generator-cli';
  const openApiGeneratorCliVersion =
    (dependencies && dependencies[packageName]) ||
    (devDependencies && devDependencies[packageName]);
  if (!openApiGeneratorCliVersion) {
    tasks.push(
      addDependenciesToPackageJson(
        tree,
        {},
        { '@openapitools/openapi-generator-cli': '^2.20.2' }
      )
    );
  }

  if (openApiGeneratorCliVersion) {
    const version = getPackageVersion({
      [packageName]: openApiGeneratorCliVersion,
    });
    if (version.major < 2) {
      logger.warn(
        log(
          `You are using @openapitools/openapi-generator-cli version ${openApiGeneratorCliVersion}. It is recommended to use version 2.0.0 or above.`
        )
      );
    } else {
      logger.info(
        log(
          `Using @openapitools/openapi-generator-cli version ${openApiGeneratorCliVersion} which is compatible with this plugin.`
        )
      );
    }
  }

  updateTargetDefaults(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  logger.info(log('✨ Core plugin initialized successfully!'));
  return runTasksInSerial(...tasks);
}

function updateTargetDefaults(tree: Tree): void {
  const nxJson = readNxJson(tree);
  const targetDefaults =
    nxJson.targetDefaults || (nxJson.targetDefaults = {} as any);
  targetDefaults['@nx-plugin-openapi/core:generate-api'] = {
    cache: true,
    inputs: ['{projectRoot}/swagger.json', '{projectRoot}/openapitools.json'],
  } as any;
  updateNxJson(tree, nxJson);
}

export default initGenerator;
