import * as sinon from "sinon";
import * as core from "@actions/core";
import * as fs from "fs";
import * as runner from "../src/runner";
import * as assert from "node:assert";
import * as cp from 'child_process';
import * as which from 'which';


describe('run-soatest-action/runner', () => {
    const sandbox = sinon.createSandbox();

    let coreSetFailed : sinon.SinonSpy;
    let coreInfo : sinon.SinonSpy;
    let coreError : sinon.SinonSpy;
    let coreWarning : sinon.SinonSpy;
    let coreDebug : sinon.SinonSpy;
    let customOption : runner.RunOptions

    beforeEach(() => {
        coreSetFailed = sandbox.fake();
        sandbox.replace(core, 'setFailed', coreSetFailed);
        coreInfo = sandbox.fake();
        sandbox.replace(core, 'info', coreInfo);
        coreError = sandbox.fake();
        sandbox.replace(core, 'error', coreError);
        coreWarning = sandbox.fake();
        sandbox.replace(core, 'warning', coreWarning);
        coreDebug = sandbox.fake();
        sandbox.replace(core, 'debug', coreDebug);
        customOption = {
            installDir: "C:/Program Files/Parasoft/SOAtest_Virtualize/2022.1",
            soatestWorkspace: "D:/soa-workspace/soatest",
            testConfig: "builtin://Demo Configuration",
            resource: "TestAssets",
            settings: "localsettings.properties",
            report: "report-parabank-soatest-action",
            reportFormat: "xml",
            environment: "testEvirontment",
            convertReportToXUnit: true,
            additionalParams: "params"
        };
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('runSOAtest()', () => {
        it('when working dir not exist, should reject', () => {
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(false));

            const testRunner = new runner.TestsRunner();

            testRunner.runSOAtest(customOption).catch((error) => {
                assert.strictEqual(error, 'Working directory D:/soa-workspace does not exist.');
            });
        });

        const setupEnvVariableValidation = () => {
            const fakeCliProcess = cp.spawn('echo', undefined);
            const fake_cpSpawn = (commandline, option) => {
                assert(option.env['PARASOFT_CONSOLE_ENCODING'] == 'utf-8');
                return fakeCliProcess;
            };
            // @ts-expect-error: Mock cp.spawn
            sandbox.replace(cp, 'spawn', fake_cpSpawn);
        }

        it('when working dir exist and PARASOFT_CONSOLE_ENCODING not exist, should run command line', async () => {
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            setupEnvVariableValidation();

            const testRunner = new runner.TestsRunner();
            await testRunner.runSOAtest(customOption);

            sinon.assert.calledWith(coreInfo, '"C:\\Program Files\\Parasoft\\SOAtest_Virtualize\\2022.1\\soatestcli" -data "D:/soa-workspace/soatest" -config "builtin://Demo Configuration" -resource "TestAssets" -settings "localsettings.properties" -report "report-parabank-soatest-action" -property "report.format=xml" -environment "testEvirontment" params');
        });

        it('when working dir exist and PARASOFT_CONSOLE_ENCODING exist, should run command line', async () => {
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            setupEnvVariableValidation();
            process.env.PARASOFT_CONSOLE_ENCODING = 'utf-8';

            const testRunner = new runner.TestsRunner();
            await testRunner.runSOAtest(customOption);

            sinon.assert.calledWith(coreInfo, '"C:\\Program Files\\Parasoft\\SOAtest_Virtualize\\2022.1\\soatestcli" -data "D:/soa-workspace/soatest" -config "builtin://Demo Configuration" -resource "TestAssets" -settings "localsettings.properties" -report "report-parabank-soatest-action" -property "report.format=xml" -environment "testEvirontment" params');
        });
    });

    describe('convertReportToXUnit()', () => {
        beforeEach(() => {
            customOption.report = 'soaReport/reports/report.xml';
            process.env.GITHUB_WORKSPACE = 'D:/soa-workspace';
        });

        it('when report not found, should reject', async () => {
            customOption.report = 'notFound.xml';

            const testRunner = new runner.TestsRunner();

            await testRunner.convertReportToXUnit(customOption).catch((error) => {
                assert.strictEqual(error, 'Parasoft SOAtest XML report not found at the specified location: notFound.xml');
            });
        });

        const mockStatSync = () => {
            const reportStats = {
                mtime: {
                    getTime: () => 10
                }
            };
            const report1Stats = {
                mtime: {
                    getTime: () => 11
                }
            };
            const xmlStats = {
                isDirectory: () => false,
                isFile: () => true
            };
            const statStub = sandbox.stub(fs, 'statSync');
            // @ts-expect-error: Mock statSync
            statStub.withArgs('D:\\soa-workspace\\soaReport\\reports\\report.xml').returns(reportStats);
            // @ts-expect-error: Mock statSync
            statStub.withArgs('D:\\soa-workspace\\soaReport\\reports\\report1.xml').returns(report1Stats);
            // @ts-expect-error: Mock statSync
            statStub.withArgs('D:\\soa-workspace\\soaReport\\reports\\report.xml').onFirstCall().returns(xmlStats);
        };

        it('when report found ,but not found SOA, should exit with -1', async () => {
            mockStatSync();
            const exist = (dir: string) => {
                if (dir == 'can not find soatestcli') {
                    return false;
                }
                return true;
            }
            // @ts-expect-error: Mock existsSync
            sandbox.replace(fs, 'existsSync', exist);
            const readDirStub = sandbox.stub(fs, 'readdirSync');
            const fakeReports = ['report.xml', 'report1.xml'];
            // @ts-expect-error: Mock readdirSync
            readDirStub.withArgs('D:\\soa-workspace\\soaReport\\reports').returns(fakeReports);
            sandbox.replace(which, 'sync', sandbox.fake.returns(undefined));
            customOption.installDir = '';

            const testRunner = new runner.TestsRunner();
            const res = await testRunner.convertReportToXUnit(customOption);

            sinon.assert.calledWith(coreWarning, 'Unable to process the XML report using Java bundled with SOAtest because the SOAtest installation directory is missing');
            assert(res.exitCode == -1);
        });

        it('when report and SOA found ,but not found java, should exit with -1', async () => {
            mockStatSync();
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            const readDirStub = sandbox.stub(fs, 'readdirSync');
            // @ts-expect-error: Mock readdirSync
            readDirStub.onFirstCall().returns(['report.xml', 'report1.xml']);
            readDirStub.onSecondCall().returns([]);

            const testRunner = new runner.TestsRunner();
            const res = await testRunner.convertReportToXUnit(customOption);

            sinon.assert.calledWith(coreWarning, 'Unable to process the XML report using Java bundled with SOAtest because it is missing');
            assert(res.exitCode == -1);
        });

        it('when report, SOA and java found, should covert report', async () => {
            mockStatSync();
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            const readDirStub = sandbox.stub(fs, 'readdirSync');
            const fakeReports = ['report.xml', 'report1.xml'];
            // @ts-expect-error: Mock readdirSync
            readDirStub.withArgs('D:\\soa-workspace\\soaReport\\reports').returns(fakeReports);

            const fakeJDK = ['com.parasoft.ptest.jdk.eclipse.core.web.1', 'com.parasoft.ptest.jdk.eclipse.core.web.2'].map(name => {
                const dirent = new fs.Dirent();
                dirent.name = name;
                sinon.stub(dirent, 'isDirectory').returns(true);
                return dirent;
            });
            readDirStub.withArgs('C:\\Program Files\\Parasoft\\SOAtest_Virtualize\\2022.1\\plugins').returns(fakeJDK);

            const fakeCliProcess = cp.spawn('echo', undefined);
            const cpSpawn = () => {
                return fakeCliProcess;
            };
            // @ts-expect-error: Mock cp.spawn
            sandbox.replace(cp, 'spawn', cpSpawn);

            const testRunner = new runner.TestsRunner();
            const res = await testRunner.convertReportToXUnit(customOption);

            sinon.assert.calledWith(coreDebug, 'Found Java located at: C:\\Program Files\\Parasoft\\SOAtest_Virtualize\\2022.1\\plugins\\com.parasoft.ptest.jdk.eclipse.core.web.1\\jdk\\bin\\java.exe');
            sinon.assert.calledWith(coreInfo, 'XUnit report generated successfully: D:\\soa-workspace\\soaReport\\reports\\report1-xunit.xml');
            assert(res.exitCode == 0);
        });
    });
});