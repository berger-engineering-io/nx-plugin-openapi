import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, logger } from '@nx/devkit';
import { addGitIgnoreEntry } from './add-gitignore-entry';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

describe('addGitIgnoreEntry', () => {
  let tree: Tree;
  const mockedLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  it('should add entry to existing .gitignore file', () => {
    tree.write('.gitignore', 'node_modules\ndist\n');

    addGitIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\ndist\n\ncoverage\n');
  });

  it('should not add duplicate entries', () => {
    tree.write('.gitignore', 'node_modules\ndist\ncoverage\n');

    addGitIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\ndist\ncoverage\n');
  });

  it('should add entry when .gitignore is empty', () => {
    tree.write('.gitignore', '');

    addGitIgnoreEntry({ tree, entry: 'build' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('\nbuild\n');
  });

  it('should handle entries with special regex characters', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: '*.log' });
    addGitIgnoreEntry({ tree, entry: 'temp[1-9].txt' });
    addGitIgnoreEntry({ tree, entry: 'path/to/file.js' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\n*.log\n\ntemp[1-9].txt\n\npath/to/file.js\n');
  });

  it('should not add entry that already exists with special characters', () => {
    tree.write('.gitignore', 'node_modules\n*.log\n');

    addGitIgnoreEntry({ tree, entry: '*.log' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n*.log\n');
  });

  it('should warn when .gitignore does not exist', () => {
    addGitIgnoreEntry({ tree, entry: 'coverage' });

    expect(mockedLogger.warn).toHaveBeenCalledWith(
      "Couldn't find .gitignore file to update"
    );
    expect(tree.exists('.gitignore')).toBe(false);
  });

  it('should handle entries with forward slashes', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: 'libs/generated-api' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\nlibs/generated-api\n');
  });

  it('should handle entries with backslashes', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: 'libs\\generated-api' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\nlibs\\generated-api\n');
  });

  it('should handle entries with dots', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: '.env.local' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\n.env.local\n');
  });

  it('should handle entries with spaces', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: 'my folder/with spaces' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\nmy folder/with spaces\n');
  });

  it('should not add partial matches', () => {
    tree.write('.gitignore', 'node_modules\ncoverage-report\n');

    addGitIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\ncoverage-report\n\ncoverage\n');
  });

  it('should handle .gitignore with no trailing newline', () => {
    tree.write('.gitignore', 'node_modules\ndist');

    addGitIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\ndist\ncoverage\n');
  });

  it('should handle multiple consecutive calls', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: 'dist' });
    addGitIgnoreEntry({ tree, entry: 'coverage' });
    addGitIgnoreEntry({ tree, entry: '.env' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\ndist\n\ncoverage\n\n.env\n');
  });

  it('should preserve existing .gitignore formatting', () => {
    const existingContent = '# Dependencies\nnode_modules/\n\n# Build\ndist/\nbuild/\n\n# IDE\n.vscode/\n.idea/\n';
    tree.write('.gitignore', existingContent);

    addGitIgnoreEntry({ tree, entry: 'coverage' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe(existingContent + '\ncoverage\n');
  });

  it('should handle complex regex patterns in entries', () => {
    tree.write('.gitignore', 'node_modules\n');

    addGitIgnoreEntry({ tree, entry: '**/*.log' });
    addGitIgnoreEntry({ tree, entry: '[Tt]emp' });
    addGitIgnoreEntry({ tree, entry: '?(a|b|c).txt' });
    addGitIgnoreEntry({ tree, entry: 'file{1..5}.txt' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n\n**/*.log\n\n[Tt]emp\n\n?(a|b|c).txt\n\nfile{1..5}.txt\n');
  });

  it('should not add duplicate complex patterns', () => {
    tree.write('.gitignore', 'node_modules\n**/*.log\n');

    addGitIgnoreEntry({ tree, entry: '**/*.log' });

    const content = tree.read('.gitignore', 'utf-8');
    expect(content).toBe('node_modules\n**/*.log\n');
  });
});