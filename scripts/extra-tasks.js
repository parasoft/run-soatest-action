/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

/**
 * Merges the content of two license files and writes the merged content to a file.
 */
function mergeLicenses() {
    console.log('Merging the content of the licenses.txt files ...');

    const file1Path = path.join(__dirname, '..', 'dist', 'licenses.txt');
    const file2Path = path.join(__dirname, '..', 'libs', 'licenses.txt');
    const mergedFilePath = file1Path;

    const file1Content = fs.readFileSync(file1Path, 'utf8');
    const file2Content = fs.readFileSync(file2Path, 'utf8');

    if (file1Content.indexOf(file2Content) !== -1) {
        console.log(`Skipped merging; ${file1Path} already contains the content of ${file2Path}.`);
        return;
    }
    const mergedContent = file1Content + '\n' + file2Content;
    fs.writeFileSync(mergedFilePath, mergedContent);

    console.log(`Merged the content of the licenses.txt files successfully: ${file2Path} >> ${file1Path}.`);
}

mergeLicenses();