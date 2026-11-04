import * as assert from 'node:assert/strict';
import type { Document, Element } from '@xmldom/xmldom';
import { transformReports } from './soatest-test-utils';
const execution = 'SOAtest_functional_execution_violations.xml';
const visual = 'soatest_visual_difference.xml';
const edges = 'association_edges.xml';
const changePrefix = 'soatest_parabank_change_impact_';
const changeModes = ['with_all_functional_tests', 'without_functional_tests', 'with_one_functional_test'];
const scenario = 'Test Suite: Test Suite/Test Suite: CartServicePort/';
const changeDetails = 'Service Details (from the Service Catalog):\n'
    + '\tService Name:  http://localhost:18080/parabank/services/store-01V2?wsdl\n'
    + '\tSaved Service Version:  Old Version\n\tCurrent Service Version:  Current Version\n\n'
    + 'Source: http://localhost:18081/current.wsdl';
const totals: [string, number, number, number][] = [
    [execution, 1, 14, 10],
    [changePrefix + 'with_one_functional_test.xml', 1, 7, 7],
    [changePrefix + 'without_functional_tests.xml', 1, 7, 7],
    [changePrefix + 'with_all_functional_tests.xml', 1, 7, 7],
    [visual, 129, 526, 1],
    [edges, 1, 8, 3]
];

function children(element: Element, tag: string): Element[] {
    return Array.from(element.childNodes)
        .filter((node): node is Element => node.nodeType === 1 && node.nodeName === tag);
}

// Each copy is tested with the Saxon distribution shipped alongside it.
for (const variant of [
    { stylesheet: 'res/soatest-xunit.xsl', saxon: 'libs/SaxonHE12-2J/saxon-he-12.2.jar' },
    { stylesheet: 'dist/soatest-xunit.xsl', saxon: 'dist/SaxonHE12-2J/saxon-he-12.2.jar' }
]) {
    describe(`SOAtest xUnit: ${variant.stylesheet}`, function () {
        this.timeout(60000);
        let reports: Map<string, Document>;

        before(() => {
            reports = transformReports(variant.stylesheet, variant.saxon, totals.map(([filename]) => filename));
        });

        function cases(filename: string): Element[] {
            return Array.from(reports.get(filename)!.getElementsByTagName('testcase'));
        }

        function testcase(filename: string, name: string): Element {
            const matches = cases(filename).filter(item => item.getAttribute('name') === name);
            assert.equal(matches.length, 1, `${filename}: expected one testcase named ${JSON.stringify(name)}`);
            return matches[0];
        }

        function failure(filename: string, name: string, message?: string, details?: string): Element {
            const failures = children(testcase(filename, name), 'failure');
            assert.equal(failures.length, 1, `${filename}: ${JSON.stringify(name)} must fail once`);
            if (message !== undefined) assert.equal(failures[0].getAttribute('message'), message);
            if (details !== undefined) assert.equal(failures[0].textContent, details);
            return failures[0];
        }

        function passing(filename: string, name: string): void {
            assert.equal(children(testcase(filename, name), 'failure').length, 0,
                `${filename}: ${JSON.stringify(name)} must stay passing`);
        }

        for (const [filename, suiteCount, caseCount, failureCount] of totals) {
            it(`${filename}: counts emitted suites and failed testcases once`, () => {
                const report = reports.get(filename)!;
                const suites = Array.from(report.getElementsByTagName('testsuite'));
                assert.equal(suites.length, suiteCount);
                assert.equal(cases(filename).length, caseCount);
                assert.equal(report.getElementsByTagName('failure').length, failureCount);
                for (const suite of suites) {
                    const emitted = children(suite, 'testcase');
                    const label = `${filename}: ${suite.getAttribute('name')}`;
                    assert.equal(suite.getAttribute('tests'), String(emitted.length), label + ' tests');
                    assert.equal(suite.getAttribute('failures'),
                        String(emitted.filter(item => children(item, 'failure').length > 0).length),
                        label + ' failures');
                }
            });
        }

        for (const kind of ['FuncViol', 'ChangeImpact', 'VisualDifference']) {
            for (const [shape, suffix] of [['Single', ''], ['Parameterized', '[Safari]']]) {
                it(`${execution}: associates ${shape} ${kind}${suffix} with its diagnostic`, () => {
                    const name = `Execution violations/${shape} ${kind}${suffix}`;
                    failure(execution, name, `${kind} failure`, `${kind} details`);
                    assert.equal(testcase(execution, name).getAttribute('time'), '1.000');
                });
            }
            it(`${execution}: keeps parameterized ${kind}[Chrome] passing`, () => {
                passing(execution, `Execution violations/Parameterized ${kind}[Chrome]`);
            });
        }

        it(`${execution}: keeps the unrelated passing testcase passing`, () => {
            passing(execution, 'Execution violations/Passing test');
        });

        it(`${execution}: preserves every mixed diagnostic and exact error separators`, () => {
            failure(execution, 'Execution violations/Mixed violations', 'Multiple errors reported',
                '==== ERROR ====\nFunctional failure'
                + '\n\n==== ERROR ====\nChange impact failure\nChange impact details'
                + '\n\n==== ERROR ====\nVisual difference failure\nSource: screenshot.png'
                + '\n\n==== ERROR ====\nFuncViol\nMixed details without summary');
        });

        for (const [name, message, details] of [
            ['Functional without message', 'FuncViol', 'Details without summary'],
            ['Unknown violation', 'Future violation failure', 'Future violation details'],
            ['Without test case', 'Visual comparison failed', '']
        ]) {
            it(`${execution}: retains the ${name} failure`, () => {
                failure(execution, 'Execution violations/' + name, message, details);
            });
        }

        it(`${edges}: uses the violation kind for a whitespace-only message`, () => {
            failure(edges, 'Edges/Whitespace message', 'FutureViolation', '');
        });
        for (const [name, message, details] of [
            ['Edges/Left boundary[gamma]', 'Left failure', 'Left details'],
            ['Edges/Right boundary[beta|gamma]', 'Right failure', 'Right details']
        ]) {
            it(`${edges}: preserves composite ID boundaries for ${name}`, () => {
                failure(edges, name, message, details);
            });
        }
        for (const name of ['Edges/Left boundary[pass]', 'Edges/Right boundary[|betagamma]',
            '', 'Edges/Missing case ID[]', 'Edges/Missing case ID[known]']) {
            it(`${edges}: prevents unrelated failures on ${JSON.stringify(name)}`, () => {
                passing(edges, name);
            });
        }

        it(`${visual}: preserves the native screenshot diagnostic and all other passing cases`, () => {
            const name = 'Test Suite: Test Suite/Test Suite: Web Scenarios/'
                + 'Scenario: SOA-18974/Test 7: Visually Compare Window 2';
            failure(visual, name, 'Visual difference found at (0, 0) of size 1,920 x 870.',
                'Source: SOA-18974_ScreenshotOutputs_test4_window2.png');
            for (const item of cases(visual)) {
                if (item.getAttribute('name') !== name) {
                    assert.equal(children(item, 'failure').length, 0, item.getAttribute('name')!);
                }
            }
        });

        const clients = ['addItemToCart', 'addNewItemToInventory', 'getItemById',
            'getItemByTitle', 'getItemsInCart', 'submitOrder', 'updateItemInCart'];
        for (const mode of changeModes) {
            const filename = changePrefix + mode + '.xml';
            clients.forEach((client, index) => {
                it(`${filename}: preserves native diagnostics only for ${client}`, () => {
                    const detail = failure(filename, `${scenario}Test ${index + 1}: ${client}`,
                        'Multiple errors reported').textContent!;
                    assert.ok(detail.includes(`Operation "${client}" - targetObjectUri changed`));
                    assert.ok(detail.includes(changeDetails));
                    for (const other of clients.filter(value => value !== client)) {
                        assert.ok(!detail.includes(`Operation "${other}"`), `${client} must not acquire ${other}`);
                    }
                    assert.equal(detail.includes('SOAP Fault'),
                        mode === 'with_all_functional_tests' && client !== 'submitOrder');
                    if (client === 'getItemById') assert.ok(detail.includes('getItemByIdentifier'));
                });
            });
            it(`${filename}: preserves exact combined submitOrder messages and details`, () => {
                failure(filename, scenario + 'Test 6: submitOrder', 'Multiple errors reported',
                    '==== ERROR ====\nOperation "submitOrder" - targetObjectUri changed from "http://bookstore.parasoft.com/"'
                    + ' to "http://bookstore2.parasoft.com/"\n' + changeDetails
                    + '\n\n==== ERROR ====\nElement "submitOrder" - namespace changed from "http://bookstore.parasoft.com/"'
                    + ' to "http://bookstore2.parasoft.com/"\n' + changeDetails);
            });
        }
    });
}
