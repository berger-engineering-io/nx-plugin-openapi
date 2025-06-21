import { TaskHasher, HasherContext } from '@nx/devkit';

import { generateApiHasher } from './hasher';

describe('generateApiHasher', () => {
  it('should generate hash', async () => {
    const mockHasher: TaskHasher = {
      hashTask: jest.fn().mockReturnValue({ value: 'hashed-task' }),
    } as unknown as TaskHasher;
    const hash = await generateApiHasher(
      {
        id: 'my-task-id',
        target: {
          project: 'proj',
          target: 'target',
        },
        overrides: {},
        outputs: [],
        parallelism: true,
      },
      {
        hasher: mockHasher,
      } as unknown as HasherContext
    );
    expect(hash).toEqual({ value: 'hashed-task' });
  });
});
