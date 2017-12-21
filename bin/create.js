const path = require('path');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const camelCase = require('lodash.camelcase');
const upperFirst = require('lodash.upperfirst');
const fs = Promise.promisifyAll(require('fs-extra'));
const { globAsync } = Promise.promisifyAll(require('glob'));
const svgToJsx = require('@balajmarius/svg-to-jsx');
const clc = require('cli-color');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const LIB_DIR = path.join(ROOT_DIR, 'lib');

const readFile = filename => fs.readFileSync(filename, 'utf8');
const writeFile = (filename, data) => fs.outputFileSync(filename, data);
const copyFile = (source, destination) => fs.copySync(source, destination);

const transformSVGToReactComponent = Promise.coroutine(function*(rawSVG, componentName, width, height) {
  const transformedSVG = yield svgToJsx(rawSVG);

  // Cleaning up; we only need the content *between* the <svg> tags
  const $ = cheerio.load(transformedSVG, { xmlMode: true });
  const $svg = $('svg');
  const viewBox = $svg.attr('viewBox');

  // Actual output of the React component
  return `
            import React from 'react';
            import SVGBase from '../SVGBase';
            
            const ${componentName} = props => (
              <SVGBase viewBox="${viewBox}" width="${width}" height="${height}" {...props}>
                ${$svg.html()}
              </SVGBase>
            );
            
            export default ${componentName};`;
});

const generateSVGs = Promise.coroutine(function*(folder) {
  const svgsToProcess = yield globAsync(`${SRC_DIR}/${folder}/*.svg`);
  const svgs = svgsToProcess.map(svg => ({
    fileName: path.basename(svg),
    folder: path
      .dirname(svg)
      .split(path.sep)
      .pop(),
  }));
  let index = '';

  yield Promise.all(
    svgs.map(
      Promise.coroutine(function*({ fileName, folder }) {
        const dimension = fileName.split('_')[0];
        const width = parseInt(dimension.split('x')[0]);
        const height = parseInt(dimension.split('x')[1]);

        // Remove '.svg' and the size (eg.: 14x14) from the fileName
        const fileNameWithoutDimension = path.basename(fileName.substring(fileName.indexOf('_') + 1), '.svg');
        const variation = fileNameWithoutDimension.split('_').pop();
        const illustrationName = fileNameWithoutDimension.substring(0, fileNameWithoutDimension.lastIndexOf('_'));
        const illustrationNameWithSize = `${illustrationName}_${dimension}_${variation}`;
        const componentName = upperFirst(camelCase(`${illustrationNameWithSize}`));

        const rawSVG = readFile(`${SRC_DIR}${path.sep}${folder}${path.sep}${fileName}`);
        const stringifiedSVGComponent = yield transformSVGToReactComponent(rawSVG, componentName, width, height);

        // Write the newly created Component strings to file
        const filename = path.join(LIB_DIR, folder, `${componentName}.js`);
        writeFile(filename, stringifiedSVGComponent);

        // Write a simple export index file for easier access
        index += `export ${componentName} from './${componentName}';\n`;
      })
    )
  );

  const indexFilename = path.join(LIB_DIR, folder, `index.js`);
  writeFile(indexFilename, index);

  console.log(clc.green(`[Teamleader] 🎉  ${svgs.length} UI ${folder} Svgs generated`));

  // Copy SVGBase.js to LIB_DIR
  copyFile(path.join(SRC_DIR, 'SVGBase.js'), path.join(LIB_DIR, 'SVGBase.js'));
});

const foldersToConvert = ['illustrations'];

fs.remove(LIB_DIR).then(() => {
  foldersToConvert.forEach(folder => generateSVGs(folder));
});
