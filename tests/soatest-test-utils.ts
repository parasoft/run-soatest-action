import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { DOMParser, Document } from '@xmldom/xmldom';

/** Transform local reports once per stylesheet; assertions inspect the real XML. */
export function transformReports(stylesheet: string, saxon: string, filenames: string[]): Map<string, Document> {
    const root = path.resolve(__dirname, '..');
    const fixtures = path.join(__dirname, 'fixtures', 'soatest');
    const java = process.env.JAVA_HOME
        ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
        : 'java';
    const reports = new Map<string, Document>();
    for (const filename of filenames) {
        const xml = execFileSync(java, [
            '-jar', path.join(root, saxon),
            '-s:' + path.join(fixtures, filename),
            '-xsl:' + path.join(root, stylesheet),
            '-versionmsg:off'
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
        const document = new DOMParser({ onError: (_level, message) => { throw new Error(message); } })
            .parseFromString(xml, 'application/xml');
        assert.equal(document.documentElement?.tagName, 'testsuites', filename);
        reports.set(filename, document);
    }
    return reports;
}
