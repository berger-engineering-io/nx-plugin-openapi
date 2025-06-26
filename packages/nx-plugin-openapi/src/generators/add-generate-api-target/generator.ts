import {
  formatFiles,
  logger,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { AddGenerateApiSchema } from './schema';
import { addGitIgnoreEntry } from '../utils/add-gitignore-entry';
import { addPrettierIgnoreEntry } from '../utils/add-prettier-ignore-entry';
import { log } from '../utils/log';

export async function addGenerateApiGenerator(
  tree: Tree,
  options: AddGenerateApiSchema
) {
  const targetName = 'generate-api';

  // Read the project configuration
  const projectConfig = readProjectConfiguration(tree, options.project);

  // Check if target already exists
  if (projectConfig.targets?.[targetName]) {
    logger.info(
      log(
        `Target "${targetName}" already exists in project "${options.project}. We will skip now."`
      )
    );
    return;
  }

  // Add the new target
  addTarget({ projectConfig, targetName, options });

  // Update the project configuration
  updateProjectConfiguration(tree, options.project, projectConfig);

  // Add to .gitignore if requested
  if (options.addToGitignore) {
    addGitIgnoreEntry({ tree, entry: options.outputPath });
    addPrettierIgnoreEntry({ tree, entry: options.outputPath });
  }

  await formatFiles(tree);

  logger.info(
    log(
      `✨ Successfully added ${targetName} target to ${options.project} project`
    )
  );
}

export default addGenerateApiGenerator;

function addTarget(args: {
  projectConfig: ProjectConfiguration;
  options: AddGenerateApiSchema;
  targetName: string;
}) {
  const { options } = args;
  // Add the new target
  args.projectConfig.targets = {
    ...args.projectConfig.targets,
    [args.targetName]: {
      executor: '@lambda-solutions/nx-plugin-openapi:generate-api',
      options: {
        inputSpec: options.inputSpec,
        outputPath: options.outputPath,
        // Uncomment if we want to support different generator types in the future
        // generatorType: options.generatorType || 'typescript-angular',
        ...(options.configFile && { configFile: options.configFile }),
        ...(options.skipValidateSpec && {
          skipValidateSpec: options.skipValidateSpec,
        }),
      },
      outputs: ['{options.outputPath}'],
    },
  };
}
