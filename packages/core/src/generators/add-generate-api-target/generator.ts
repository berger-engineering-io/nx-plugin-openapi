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
  const targetName = options.targetName || 'generate-api';

  const projectConfig = readProjectConfiguration(tree, options.project);

  if (projectConfig.targets?.[targetName]) {
    logger.info(
      log(
        `Target "${targetName}" already exists in project "${options.project}. We will skip now."`
      )
    );
    return;
  }

  addTarget({ projectConfig, targetName, options });
  updateProjectConfiguration(tree, options.project, projectConfig);

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
  args.projectConfig.targets = {
    ...args.projectConfig.targets,
    [args.targetName]: {
      executor: '@nx-plugin-openapi/core:generate-api',
      options: {
        generator: 'openapi-tools',
        inputSpec: options.inputSpec,
        outputPath: options.outputPath,
        ...(options.configFile && {
          generatorOptions: { configFile: options.configFile },
        }),
        ...(options.skipValidateSpec && {
          generatorOptions: {
            ...(options.configFile ? { configFile: options.configFile } : {}),
            skipValidateSpec: options.skipValidateSpec,
          },
        }),
      },
      outputs: ['{options.outputPath}'],
    },
  };
}
