import {
  CustomHasher,
  Hash,
  hashArray,
  logger,
  workspaceRoot,
} from '@nx/devkit';
import { z } from 'zod';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { log } from '../../generators/utils/log';

const GenerateApiExecutorSchema = z.object({
  inputSpec: z.union([z.string(), z.record(z.string())]),
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

  const targetProjectOptionsParseResult = GenerateApiExecutorSchema.safeParse(
    targetProjectTarget.options
  );

  if (!targetProjectOptionsParseResult.success) {
    // TODO think about what to do here
    logger.error(
      log(`Error parsing executor options for task ${task.target.target}`)
    );
    throw new Error(
      `[@lambda-solutions/nx-plugin-openapi] Error parsing executor options for task ${task.target.target}: ${targetProjectOptionsParseResult.error.message}`
    );
  }
  const targetProjectOptions = targetProjectOptionsParseResult.data;
  
  const taskHash = await context.hasher.hashTask(
    task,
    context.taskGraph,
    process.env
  );

  // Handle multiple inputSpec (object)
  if (typeof targetProjectOptions.inputSpec === 'object') {
    logger.verbose(log('Multiple inputSpec detected.'));
    const hashes: string[] = [taskHash.value];
    
    for (const [serviceName, specPath] of Object.entries(targetProjectOptions.inputSpec)) {
      hashes.push(serviceName);
      
      // Check if it's a URL
      const isUrl = z.string().url().safeParse(specPath).success;
      
      if (isUrl) {
        logger.verbose(log(`Fetching remote OpenAPI spec for ${serviceName}...`));
        const response = await fetch(specPath);
        
        if (!response.ok) {
          logger.error(
            log(`Failed to fetch remote OpenAPI spec for ${serviceName}: ${response.statusText}`)
          );
          return Promise.reject(
            new Error(`Failed to fetch remote OpenAPI spec for ${serviceName}: ${response.statusText}`)
          );
        }
        
        const content = await response.text();
        hashes.push(specPath, hashFileContent(content));
      } else {
        // Local file
        const inputSpecPath = join(contextRoot, specPath);
        if (existsSync(inputSpecPath)) {
          const fileContent = readFileSync(inputSpecPath, { encoding: 'utf8' });
          hashes.push(inputSpecPath, hashFileContent(fileContent));
        }
      }
    }
    
    const hash: Hash = {
      value: hashArray(hashes),
      details: {
        command: taskHash.details.command,
        nodes: taskHash.details.nodes,
        implicitDeps: taskHash.details.implicitDeps,
        runtime: taskHash.details.runtime,
      },
    };
    return Promise.resolve(hash);
  }

  // Handle single inputSpec (string)
  const inputSpec = targetProjectOptions.inputSpec as string;
  
  // Check if inputSpec is url or not
  const parseInputSpecResult = z.string().url().safeParse(inputSpec);

  // Case local file
  if (!parseInputSpecResult.success) {
    logger.verbose(log('Local file detected for inputSpec.'));
    const inputSpecPath = join(contextRoot, inputSpec);
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

  // case URL
  if (parseInputSpecResult.success) {
    logger.verbose(log('Remote URL detected for inputSpec.'));

    logger.verbose(log(`Fetching remote OpenAPI spec...`));
    const response = await fetch(inputSpec);

    if (!response.ok) {
      logger.error(
        log(`Failed to fetch remote OpenAPI spec: ${response.statusText}`)
      );
      return Promise.reject(
        new Error(`Failed to fetch remote OpenAPI spec: ${response.statusText}`)
      );
    }

    logger.verbose(
      log(`Remote OpenAPI spec fetched successfully. Now hashing the content.`)
    );

    const content = await response.text();
    const fileHash = hashFileContent(content);

    const hash: Hash = {
      value: hashArray([taskHash.value, inputSpec, fileHash]),
      details: {
        command: taskHash.details.command,
        nodes: taskHash.details.nodes,
        implicitDeps: taskHash.details.implicitDeps,
        runtime: taskHash.details.runtime,
      },
    };
    return Promise.resolve(hash);
  }

  // fallback
  return await context.hasher.hashTask(task, context.taskGraph, process.env);
};

export default correctgenerateApiHasher;

function hashFileContent(fileContent: string): string {
  const hash = createHash('sha256');
  hash.update(fileContent, 'utf8');
  return hash.digest('hex');
}
