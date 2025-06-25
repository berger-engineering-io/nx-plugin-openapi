import {
  formatFiles,
  logger,
  readNxJson,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  updateTargetDefaults(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  logger.info(
    '[@lambda-solutions/nx-plugin-openapi]✨ Plugin initialized successfully!'
  );
}

function updateTargetDefaults(tree: Tree): void {
  const nxJson = readNxJson(tree);

  const targetDefaults = nxJson.targetDefaults;

  targetDefaults['@lambda-solutions/nx-plugin-openapi:generate-api'] = {
    cache: true,
    inputs: ['{projectRoot}/swagger.json', '{projectRoot}/openapitools.json'],
  };

  updateNxJson(tree, nxJson);
}

export default initGenerator;
