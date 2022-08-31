import { jest } from '@jest/globals';
import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { createFixtures, getFixturePath } from '../test/util.js';
import { lessTransformer } from './less.js';

const loader = new Loader(lessTransformer);
const loadSpy = jest.spyOn(loader, 'load');

afterEach(() => {
  loadSpy.mockClear();
});

test('handles less features', async () => {
  createFixtures({
    '/test/1.less': dedent`
      @import './2.less'; // less feature test (@use)
      .a_1 { dummy: ''; }
      .a_2 {
        dummy: '';
        // less feature test (nesting)
        .a_2_1 { dummy: ''; }
        &_2 { dummy: ''; }
        .b_1();
        .b_2();
        composes: a_1; // css module feature test (composes)
        composes: c from './3.less'; // css module feature test (composes from other file)
      }
      `,
    '/test/2.less': dedent`
      .b_1 { dummy: ''; }
      .b_2() { dummy: ''; }
      `,
    '/test/3.less': dedent`
      .c { dummy: ''; }
      `,
  });
  const result = await loader.load(getFixturePath('/test/1.less'));

  // FIXME: The end position of 'a_2_2' is incorrect.
  expect(result).toMatchInlineSnapshot(`
    {
      dependencies: ["<fixtures>/test/2.less", "<fixtures>/test/3.less"],
      tokens: [
        {
          name: "b_1",
          originalLocations: [
            { filePath: "<fixtures>/test/2.less", start: { line: 1, column: 1 }, end: { line: 1, column: 3 } },
          ],
        },
        {
          name: "a_1",
          originalLocations: [
            { filePath: "<fixtures>/test/1.less", start: { line: 2, column: 1 }, end: { line: 2, column: 3 } },
          ],
        },
        {
          name: "a_2",
          originalLocations: [
            { filePath: "<fixtures>/test/1.less", start: { line: 3, column: 1 }, end: { line: 3, column: 3 } },
          ],
        },
        {
          name: "a_2_1",
          originalLocations: [
            { filePath: "<fixtures>/test/1.less", start: { line: 6, column: 3 }, end: { line: 6, column: 7 } },
          ],
        },
        {
          name: "a_2_2",
          originalLocations: [
            { filePath: "<fixtures>/test/1.less", start: { line: 7, column: 3 }, end: { line: 7, column: 7 } },
          ],
        },
        {
          name: "c",
          originalLocations: [
            { filePath: "<fixtures>/test/3.less", start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
          ],
        },
      ],
    }
  `);
});

test('tracks dependencies that have been pre-bundled by less compiler', async () => {
  createFixtures({
    '/test/1.less': dedent`
    @import './2.less';
    @import './3.less';
    `,
    '/test/2.less': dedent`
    `,
    '/test/3.less': dedent`
    @import './4.less';
    `,
    '/test/4.less': dedent`
    `,
  });
  const result = await loader.load(getFixturePath('/test/1.less'));

  // The files imported using @import are pre-bundled by the compiler.
  // Therefore, `Loader#load` is not called to process other files.
  expect(loadSpy).toBeCalledTimes(1);
  expect(loadSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.less'));

  // The files pre-bundled by the compiler are also included in `result.dependencies`
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  expect(result.dependencies.sort()).toStrictEqual(
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    ['/test/2.less', '/test/3.less', '/test/4.less'].map(getFixturePath).sort(),
  );
});