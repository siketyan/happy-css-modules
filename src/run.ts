import * as path from 'path';
import * as util from 'util';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import _glob from 'glob';
import { DtsContent } from './dts-content';
import { DtsCreator } from './dts-creator';

const glob = util.promisify(_glob);

interface RunOptions {
  pattern?: string;
  outDir?: string;
  watch?: boolean;
  camelCase?: boolean;
  namedExports?: boolean;
  declarationMap?: boolean;
  transform?: (newPath: string) => Promise<string>;
  silent?: boolean;
}

export async function run(searchDir: string, options: RunOptions = {}): Promise<void> {
  const filesPattern = path.join(searchDir, options.pattern || '**/*.css');

  const creator = new DtsCreator({
    rootDir: process.cwd(),
    searchDir,
    outDir: options.outDir,
    camelCase: options.camelCase,
    namedExports: options.namedExports,
    declarationMap: options.declarationMap,
  });

  const writeFile = async (f: string): Promise<void> => {
    try {
      const content: DtsContent = await creator.create(f, options.transform, !!options.watch);
      await content.writeFile();

      if (!options.silent) {
        console.log('Wrote ' + chalk.green(content.outputFilePath));
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      console.error(chalk.red('[Error] ' + error));
    }
  };

  if (!options.watch) {
    const files = await glob(filesPattern);
    await Promise.all(files.map(writeFile));
  } else {
    console.log('Watch ' + filesPattern + '...');

    const watcher = chokidar.watch([filesPattern.replace(/\\/g, '/')]);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watcher.on('add', writeFile);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watcher.on('change', writeFile);
    await waitForever();
  }
}

async function waitForever(): Promise<void> {
  return new Promise<void>(() => {
    // noop
  });
}
