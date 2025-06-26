import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { addPrettierIgnoreEntry } from './add-prettier-ignore-entry';

describe('addPrettierIgnoreEntry', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add entry to existing .prettierignore file', () => {
    tree.write('.prettierignore', 'node_modules\ndist\n');

    addPrettierIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\ndist\n\ncoverage\n');
  });

  it('should not add duplicate entries', () => {
    tree.write('.prettierignore', 'node_modules\ndist\ncoverage\n');

    addPrettierIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\ndist\ncoverage\n');
  });

  it('should do nothing when .prettierignore does not exist', () => {
    addPrettierIgnoreEntry({ tree, entry: 'coverage' });

    expect(tree.exists('.prettierignore')).toBe(false);
  });

  it('should add entry when .prettierignore is empty', () => {
    tree.write('.prettierignore', '');

    addPrettierIgnoreEntry({ tree, entry: 'build' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('\nbuild\n');
  });

  it('should handle entries with special regex characters', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: '*.log' });
    addPrettierIgnoreEntry({ tree, entry: 'temp[1-9].txt' });
    addPrettierIgnoreEntry({ tree, entry: 'path/to/file.js' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\n*.log\n\ntemp[1-9].txt\n\npath/to/file.js\n');
  });

  it('should not add entry that already exists with special characters', () => {
    tree.write('.prettierignore', 'node_modules\n*.log\n');

    addPrettierIgnoreEntry({ tree, entry: '*.log' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n*.log\n');
  });

  it('should handle entries with forward slashes', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: 'libs/generated-api' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\nlibs/generated-api\n');
  });

  it('should handle entries with backslashes', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: 'libs\\generated-api' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\nlibs\\generated-api\n');
  });

  it('should handle entries with dots', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: '.env.local' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\n.env.local\n');
  });

  it('should handle entries with spaces', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: 'my folder/with spaces' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\nmy folder/with spaces\n');
  });

  it('should not add partial matches', () => {
    tree.write('.prettierignore', 'node_modules\ncoverage-report\n');

    addPrettierIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\ncoverage-report\n\ncoverage\n');
  });

  it('should handle .prettierignore with no trailing newline', () => {
    tree.write('.prettierignore', 'node_modules\ndist');

    addPrettierIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\ndist\ncoverage\n');
  });

  it('should handle multiple consecutive calls', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: 'dist' });
    addPrettierIgnoreEntry({ tree, entry: 'coverage' });
    addPrettierIgnoreEntry({ tree, entry: '.env' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\ndist\n\ncoverage\n\n.env\n');
  });

  it('should preserve existing .prettierignore formatting', () => {
    const existingContent = '# Dependencies\nnode_modules/\n\n# Build\ndist/\nbuild/\n\n# IDE\n.vscode/\n.idea/\n';
    tree.write('.prettierignore', existingContent);

    addPrettierIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe(existingContent + '\ncoverage\n');
  });

  it('should handle complex regex patterns in entries', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: '**/*.log' });
    addPrettierIgnoreEntry({ tree, entry: '[Tt]emp' });
    addPrettierIgnoreEntry({ tree, entry: '?(a|b|c).txt' });
    addPrettierIgnoreEntry({ tree, entry: 'file{1..5}.txt' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\n**/*.log\n\n[Tt]emp\n\n?(a|b|c).txt\n\nfile{1..5}.txt\n');
  });

  it('should not add duplicate complex patterns', () => {
    tree.write('.prettierignore', 'node_modules\n**/*.log\n');

    addPrettierIgnoreEntry({ tree, entry: '**/*.log' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n**/*.log\n');
  });

  it('should handle entries that look like comments', () => {
    tree.write('.prettierignore', 'node_modules\n');

    addPrettierIgnoreEntry({ tree, entry: '# not a comment' });
    addPrettierIgnoreEntry({ tree, entry: '// also not a comment' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules\n\n# not a comment\n\n// also not a comment\n');
  });

  it('should handle entries with trailing slashes', () => {
    tree.write('.prettierignore', 'node_modules/\n');

    addPrettierIgnoreEntry({ tree, entry: 'dist/' });
    addPrettierIgnoreEntry({ tree, entry: 'coverage/' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules/\n\ndist/\n\ncoverage/\n');
  });

  it('should not modify file if entry already exists with trailing slash', () => {
    tree.write('.prettierignore', 'node_modules/\ndist/\n');

    addPrettierIgnoreEntry({ tree, entry: 'dist/' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('node_modules/\ndist/\n');
  });

  it('should handle entries with negation patterns', () => {
    tree.write('.prettierignore', '*.log\n');

    addPrettierIgnoreEntry({ tree, entry: '!important.log' });

    const content = tree.read('.prettierignore', 'utf-8');
    expect(content).toBe('*.log\n\n!important.log\n');
  });
});