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

function updateTargetDefaults(tree: Tree): void {
  const nxJson = readNxJson(tree);
  const targetDefaults = (nxJson.targetDefaults ||= {} as Record<
    string,
    unknown
  >);
  targetDefaults['@nx-plugin-openapi/core:generate-api'] = {
    cache: true,
    inputs: ['{projectRoot}/swagger.json', '{projectRoot}/openapitools.json'],
  } as { cache: boolean; inputs: string[] };
  updateNxJson(tree, nxJson);
}

export default initGenerator;
