
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');

let xmlReportText = fs.readFileSync("C:/Users/Mrwan/Desktop/New folder/soatest_workspace/reports/reports.xml", 'utf8');
const xslJsonText = fs.readFileSync(path.join(__dirname, 'dist', "soatest-xunit.sef.json"), 'utf8');
const options = {
    stylesheetText: xslJsonText,
    sourceText: xmlReportText,
    destination: "serialized"
};

const resultString = SaxonJS.transform(options).principalResult;
fs.writeFileSync("C:/Users/Mrwan/Desktop/New folder/soatest_workspace/reports/reports-xunit.xml", resultString);