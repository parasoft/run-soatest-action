/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Merges the content of two license files and writes the merged content to a file.
 */
function mergeLicenses() {
    console.log('Merging the content of the licenses.txt files ...');

    const file1Path = path.join(__dirname, 'dist', 'licenses.txt');
    const file2Path = path.join(__dirname, 'libs', 'licenses.txt');
    const mergedFilePath = file1Path;

    const file1Content = fs.readFileSync(file1Path, 'utf8');
    const file2Content = fs.readFileSync(file2Path, 'utf8');

    if (file1Content.indexOf(file2Content) !== -1) {
        console.log(`Skipped merging, the content of the ${file1Path} file contains the content of ${file2Path} file already.`);
        return;
    }
    const mergedContent = file1Content + '\n' + file2Content;
    fs.writeFileSync(mergedFilePath, mergedContent);

    console.log(`Merged the content of the licenses.txt files successfully: ${file2Path} >> ${file1Path}.`);
}

/**
 * Processes the soatest-xunit.sef.json file by replacing its properties, some the value of properties contain sensitive information 
 * and others change in real-time, affecting the tracking of git.
 */
function processSOAtestXUnitSelJsonFile() {
    console.log('Processing the soatest-xunit.sef.json file ...');
    // Must to be updated when the xsl file is updated, the value is used to check if the xsl file was changed.
    const expectedHashOfXslFile = '4d3a0c707bee683bcedf605952a6218ec9c0821e';
    // Must to be updated when the xsl file is updated, the value is the checksum of .sef.json file.
    const replacedΣ = '5a38157e';
    // Optional to be updated when the xsl file is updated
    const replacedBuildDateTime = '2024-03-19T15:47:19.299+08:00';
    // No need to be updated when the xsl file is updated
    const replacedBase = './soatest-xunit.xsl';
    // No need to be updated when the xsl file is updated
    const replacedBaseUri = './soatest-xunit.xsl';

    const xslFilePath = path.join(__dirname, 'dist', 'soatest-xunit.xsl');
    const realHash = getFileHash(xslFilePath);

    const selJsonFilePath = path.join(__dirname, 'dist', 'soatest-xunit.sef.json');
    const selJsonContent = fs.readFileSync(selJsonFilePath, 'utf8');
    const selJson = JSON.parse(selJsonContent);

    if (expectedHashOfXslFile != realHash) {
        throw new Error(
            `The file ${xslFilePath} was changed, and the hash of it does not match the expected hash.
             You must update the current expectedHashOfXslFile value according to the updated soatest-xunit.xsl file.
               Expected hash: ${expectedHashOfXslFile}
               Real hash: ${realHash}
             You must update replacedΣ values according to the generated soatest-xunit.sef.json file as well.
               Real Σ: This value can be found in the error messages after using SaxonJS to transform the report manually using properties value replaced .sef.json file, the error messages contains the real Σ value.
                       e.g. the real Σ value is d06b1608 when error message is like: Invalid checksum in SEF f06b1608 != d06b1608; code:SXJS0006.
             These variables exist in the processSOAtestXUnitSelJsonFile function in the extra-tasks.js file.`
        );
    }

    console.log(`Replacing the value of the properties in ${selJsonFilePath} ...`);
    console.log(`  buildDateTime value: ${selJson.buildDateTime} to ${replacedBuildDateTime}`);
    replacePropertyValue(selJson, 'buildDateTime', replacedBuildDateTime);
    console.log(`  Σ value: ${selJson.Σ} to ${replacedΣ}`);
    replacePropertyValue(selJson, 'Σ', replacedΣ);
    console.log(`  All base values to ${replacedBase}`);
    replacePropertyValue(selJson, 'base', replacedBase);
    console.log(`  All baseUri values to ${replacedBaseUri}`);
    replacePropertyValue(selJson, 'baseUri', replacedBaseUri);

    fs.writeFileSync(selJsonFilePath, JSON.stringify(selJson, null, 2));

    console.log('Processed the soatest-xunit.sef.json file successfully.');
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