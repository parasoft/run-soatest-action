/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const file1Path = path.join(__dirname, 'dist', 'licenses.txt');
const file2Path = path.join(__dirname, 'data', 'licenses.txt');
const mergedFilePath = file1Path;

const file1Content = fs.readFileSync(file1Path, 'utf8');
const file2Content = fs.readFileSync(file2Path, 'utf8');

const mergedContent = file1Content + '\n' + file2Content;

fs.writeFileSync(mergedFilePath, mergedContent);