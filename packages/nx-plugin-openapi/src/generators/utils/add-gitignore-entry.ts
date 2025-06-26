import { logger, Tree } from '@nx/devkit';

export function addGitIgnoreEntry(args: { tree: Tree; entry: string }): void {
  if (args.tree.exists('.gitignore')) {
    let content = args.tree.read('.gitignore', 'utf-8');
    // Check if entry already exists
    const entryRegex = new RegExp(
      `^${args.entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'gm'
    );
    if (entryRegex.test(content)) {
      return;
    }

    content = `${content}\n${args.entry}\n`;
    args.tree.write('.gitignore', content);
  } else {
    logger.warn(`Couldn't find .gitignore file to update`);
  }
}
