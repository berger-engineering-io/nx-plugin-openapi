import {
  CustomHasher,
  logger,
  Hash,
  hashArray,
  workspaceRoot,
} from '@nx/devkit';
import { z } from 'zod';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';

const GenerateApiExecutorSchema = z.object({
  inputSpec: z.string(),
  generatorType: z.string().optional(),
  outputPath: z.string(),
  configFile: z.string().optional(),
  skipValidateSpec: z.boolean().optional(),
  pluginMetadataDir: z.string().optional(),
});

/**
 * This is a boilerplate custom hasher that matches
 * the default Nx hasher. If you need to extend the behavior,
 * you can consume workspace details from the context.
 */

export const correctgenerateApiHasher: CustomHasher = async (task, context) => {
  const contextRoot = workspaceRoot;

  const taskTargetProject = task.target.project;
  const taskTargetTarget = task.target.target;

  const targetProject =
    context.projectsConfigurations.projects[taskTargetProject];
  const targetProjectTarget = targetProject.targets[taskTargetTarget];
  const projectName = targetProject.name;

  const targetProjectOptionsParseResult = GenerateApiExecutorSchema.safeParse(
    targetProjectTarget.options
  );

  if (!targetProjectOptionsParseResult.success) {
    // TODO think about what to do here
    logger.error(
      `[@lambda-solutions/nx-plugin-openapi] Error parsing executor options for task ${task.target.target}`
    );
  }
  const targetProjectOptions = targetProjectOptionsParseResult.data;
  // Check if inputSpec is url or not
  const parseInputSpecResult = z
    .string()
    .url()
    .safeParse(targetProjectOptions.inputSpec);

  const taskHash = await context.hasher.hashTask(
    task,
    context.taskGraph,
    process.env
  );

  // Case local file
  // read content and create hash for it
  // nx hasher: fileContent and file name
  if (!parseInputSpecResult.success) {
    logger.verbose(
      '[@lambda-solutions/nx-plugin-openapi] Local file detected for inputSpec.'
    );
    const inputSpecPath = join(contextRoot, targetProjectOptions.inputSpec);
    if (existsSync(inputSpecPath)) {
      const fileContent = readFileSync(inputSpecPath, { encoding: 'utf8' });
      const fileHash = hashFileContent(fileContent);

      const hash: Hash = {
        value: hashArray([taskHash.value, inputSpecPath, fileHash]),
        details: {
          command: taskHash.details.command,
          nodes: taskHash.details.nodes,
          implicitDeps: taskHash.details.implicitDeps,
          runtime: taskHash.details.runtime,
        },
      };
      return Promise.resolve(hash);
    }
  }

  // TODO
  // case URl
  // fetch content and hash it
  // nx hasher: content and url
  if (parseInputSpecResult.success) {
    logger.verbose(
      '[@lambda-solutions/nx-plugin-openapi] Remote URL detected for inputSpec.'
    );

    const inputSpecUrl = targetProjectOptions.inputSpec;

    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Fetching remote OpenAPI spec...`
    );
    const response = await fetch(inputSpecUrl);

    if (!response.ok) {
      logger.error(
        `[@lambda-solutions/nx-plugin-openapi] Failed to fetch remote OpenAPI spec: ${response.statusText}`
      );
      return Promise.reject(
        new Error(`Failed to fetch remote OpenAPI spec: ${response.statusText}`)
      );
    }

    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Remote OpenAPI spec fetched successfully. Now hashing the content.`
    );

    const content = await response.text();
    const fileHash = hashFileContent(content);

    const hash: Hash = {
      value: hashArray([taskHash.value, inputSpecUrl, fileHash]),
      details: {
        command: taskHash.details.command,
        nodes: taskHash.details.nodes,
        implicitDeps: taskHash.details.implicitDeps,
        runtime: taskHash.details.runtime,
      },
    };
    return Promise.resolve(hash);
  }

  // optional for both cases - store stuff in .nx-openapi-plugin folder?
};

export default correctgenerateApiHasher;

function hashFileContent(fileContent: string): string {
  const hash = createHash('sha256');
  hash.update(fileContent, 'utf8');
  return hash.digest('hex');
}
