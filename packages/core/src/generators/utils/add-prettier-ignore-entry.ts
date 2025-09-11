import { Tree } from '@nx/devkit';

export function addPrettierIgnoreEntry(args: {
  tree: Tree;
  entry: string;
}): void {
  if (!args.tree.exists('.prettierignore')) return;
  let content = args.tree.read('.prettierignore', 'utf-8');
  const entryRegex = new RegExp(
    `^${args.entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
    'gm'
  );
  if (entryRegex.test(content)) return;
  content = `${content}\n${args.entry}\n`;
  args.tree.write('.prettierignore', content);
}
