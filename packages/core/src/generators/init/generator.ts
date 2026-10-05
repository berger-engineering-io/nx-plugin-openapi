import {
  formatFiles,
  GeneratorCallback,
  logger,
  readNxJson,
  runTasksInSerial,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { log } from '../utils/log';

const GENERATE_API_EXECUTOR = '@nx-plugin-openapi/core:generate-api';

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

  const tasks: GeneratorCallback[] = [];

  updateTargetDefaults(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  logger.info(log('✨ Core plugin initialized successfully!'));
  return runTasksInSerial(...tasks);
}

/**
 * Enables caching for the generate-api executor. Spec inputs are not
 * hard-wired: the executor hasher hashes the spec and inferred targets add
 * their inputs. Existing user config is kept.
 */
function updateTargetDefaults(tree: Tree): void {
  const nxJson = readNxJson(tree);
  const targetDefaults = (nxJson.targetDefaults ||= {});
  targetDefaults[GENERATE_API_EXECUTOR] = {
    cache: true,
    ...targetDefaults[GENERATE_API_EXECUTOR],
  };
  updateNxJson(tree, nxJson);
}

export default initGenerator;
