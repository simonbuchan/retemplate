const Path = require("path");
const fs = require("fs");
const util = require("util");
const babel = require("@babel/core");

const srcDir = Path.resolve(__dirname, "..", "src");
const outDir = Path.resolve(__dirname, "..", "lib");

util.inspect.defaultOptions.depth = 10;

const stat = util.promisify(fs.stat);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const transform = util.promisify(babel.transform);

async function main() {
  const ext = '.ts';
  const srcFilenames = await walk(srcDir, ext);
  await Promise.all(
    srcFilenames.map(async srcFilename => {
      const relativeDir = Path.relative(srcDir, Path.dirname(srcFilename));
      const outFileDir = Path.join(outDir, relativeDir);
      await mkdir(outFileDir).catch(error => {
        if (error.code === 'EEXIST') {
          return;
        }
        return Promise.reject(error);
      });

      const basename = Path.basename(srcFilename, ext);
      const srcCode = await readFile(srcFilename, 'utf8');
      const result = await transform(srcCode, {
        filename: srcFilename,
      });

      const outFilename = Path.join(outFileDir, basename + '.js');
      console.log(outFilename);
      await writeFile(outFilename, result.code);
      if (result.map) {
        await writeFile(outFilename + '.map', JSON.stringify(result.map));
      }
    })
  );
}

async function walk(dir, ext, results = []) {
  const names = await readdir(srcDir);
  const paths = names.map(name => Path.join(dir, name));
  results.push(...paths.filter(name => name.endsWith(ext)));
  await Promise.all(paths.map(async path => {
    const pathStat = await stat(path);
    if (pathStat.isDirectory()) {
      await walk(path, ext, results);
    }
  }));
  return results;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
