/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

/**
 * Processes the soatest-xunit.sef.json file by replacing its properties. Some of the property values contain sensitive information 
 * and other changes in real-time, affecting the tracking of Git.
 */
function processSOAtestXUnitSelJsonFile() {
    console.log('Processing the soatest-xunit.sef.json file ...');

    // Must be updated when the .xsl file is updated; the value is used to check if the .xsl file has changed.
    const expectedHashOfXslFile = 'bd28c8f07a48b04af1e2c181bca31630f6caa3b7';
    // Must be updated when the .xsl file is updated; the value is the checksum of .sef.json file.
    const ΣPlaceHolder = '5a38157e';
    // Optional to update when the .xsl file is updated
    const buildDateTimePlaceholder = '2024-03-19T15:47:19.299+08:00';

    const basePlaceholder = './soatest-xunit.xsl';
    const baseUriPlaceholder = './soatest-xunit.xsl';

    const xslFilePath = path.join(__dirname, '..', 'dist', 'soatest-xunit.xsl');
    const realHash = getFileHash(xslFilePath);

    const sefJsonFilePath = path.join(__dirname,'..', 'dist', 'soatest-xunit.sef.json');
    const sefJsonContent = fs.readFileSync(sefJsonFilePath, 'utf8');
    const sefJson = JSON.parse(sefJsonContent);

    if (expectedHashOfXslFile != realHash) {
        throw new Error(
            `The file ${xslFilePath} has been changed, and its hash does not match the expected hash.
             You must update the value of 'expectedHashOfXslFile' based on the updated soatest-xunit.xsl file.
                Expected hash: ${expectedHashOfXslFile}
                Actual hash: ${realHash}
             You must update the values of 'replacedΣ' according to the generated soatest-xunit.sef.json file.
                Actual Σ: This value can be found in the error messages after manually transforming the report using SaxonJS with the .sef.json file, which has the properties' values replaced. The error messages contain the actual Σ value.
                    e.g. the actual Σ value is d06b1608 when error message is like: Invalid checksum in SEF f06b1608 != d06b1608; code:SXJS0006.
             These variables are located in the 'processSOAtestXUnitSelJsonFile' function in the 'extra-tasks.js' file.`
        );
    }

    console.log(`Replacing the value of the properties in ${sefJsonFilePath} ...`);
    console.log(`  buildDateTime value: ${sefJson.buildDateTime} to ${buildDateTimePlaceholder}`);
    replacePropertyValue(sefJson, 'buildDateTime', buildDateTimePlaceholder);
    console.log(`  Σ value: ${sefJson.Σ} to ${ΣPlaceHolder}`);
    replacePropertyValue(sefJson, 'Σ', ΣPlaceHolder);
    console.log(`  All base values to ${basePlaceholder}`);
    replacePropertyValue(sefJson, 'base', basePlaceholder);
    console.log(`  All baseUri values to ${baseUriPlaceholder}`);
    replacePropertyValue(sefJson, 'baseUri', baseUriPlaceholder);

    fs.writeFileSync(sefJsonFilePath, JSON.stringify(sefJson, null, 2));

    console.log('Successfully processed the soatest-xunit.sef.json file.');
}

/**
 * Recursively replaces the value of a property in an object or array.
 * @param {Object|Array} obj - The object or array to traverse.
 * @param {string} propName - The name of the property to replace.
 * @param {any} newValue - The new value to assign to the property.
 */
function replacePropertyValue(obj, propName, newValue) {
    if (obj instanceof Array) {
        obj.forEach(function (item) {
            replacePropertyValue(item, propName, newValue);
        });
    } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(function (key) {
            if (key === propName) {
                obj[key] = newValue;
            } else {
                replacePropertyValue(obj[key], propName, newValue);
            }
        });
    }
}

function getFileHash(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return;
    }
    const xslContent = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha1');
    hashSum.update(xslContent);
    return hashSum.digest('hex');
}

// Call the functions
mergeLicenses();
processSOAtestXUnitSelJsonFile();