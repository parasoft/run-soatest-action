import * as sinon from "sinon";
import * as core from "@actions/core";
import * as runner from "../src/runner";
import * as os from 'os';
import * as path from "node:path";
import { fail } from "should";
import * as fs from "fs";
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
            report: "reports",
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
        beforeEach(() => {
            process.env.GITHUB_WORKSPACE = __dirname;
        });

        it('should reject when working dir not exist', async () => {
            process.env.GITHUB_WORKSPACE = 'notFound';

            const testRunner = new runner.TestsRunner();

            await testRunner.runSOAtest(customOption).catch((error) => {
                error.should.equal('Working directory does not exist: notFound');
            });
        });

        it('should reject when soatestWorkspace not found', async () => {
            customOption.soatestWorkspace = 'null';

            const testRunner = new runner.TestsRunner();

            await testRunner.runSOAtest(customOption).catch((error) => {
                error.should.equal('SOAtest workspace directory does not exist: null');
            });
        });

        it('should run command line', async () => {
            customOption.soatestWorkspace = __dirname;
            const testRunner = new runner.TestsRunner() as any;
            sandbox.replace(testRunner, 'createSOAtestCommandLine', sandbox.fake.returns('commandLine'));

            await testRunner.runSOAtest(customOption);

            sinon.assert.calledWith(coreInfo, 'commandLine');
        });
    });

    describe('convertReportToXUnit()', () => {
        beforeEach(() => {
            process.env.GITHUB_WORKSPACE = __dirname;
        });

        it('should reject when report not found', async () => {
            const testRunner = new runner.TestsRunner() as any;
            sandbox.replace(testRunner, 'findParasoftXmlReport', sandbox.fake.returns(undefined));

            await testRunner.convertReportToXUnit(customOption).catch((error) => {
                error.should.equal('Parasoft SOAtest XML report not found at the specified location: reports');
            });
        });

        it('should exit with -1 when java not found', async () => {
            const testRunner = new runner.TestsRunner() as any;
            sandbox.replace(testRunner, 'findParasoftXmlReport', sandbox.fake.returns('reports/report.xml'));
            sandbox.replace(testRunner, 'getSOAtestJavaPath', sandbox.fake.returns(undefined));

            const res = await testRunner.convertReportToXUnit(customOption);

            (res.exitCode).should.equal(-1);
        });

        it('should exit with 0 when covert success', async () => {
            const testRunner = new runner.TestsRunner() as any;
            sandbox.replace(testRunner, 'findParasoftXmlReport', sandbox.fake.returns('reports/report.xml'));
            sandbox.replace(testRunner, 'getSOAtestJavaPath', sandbox.fake.returns('path/to/java'));
            sandbox.replace(testRunner, 'convertReportWithJava', sandbox.fake.returns(Promise.resolve({exitCode: 0})));

            const res = await testRunner.convertReportToXUnit(customOption);

            sinon.assert.calledWith(coreInfo, 'XUnit report generated successfully: reports/report-xunit.xml');
            (res.exitCode).should.equal(0);
        });
    });

    it('createSOAtestCommandLine() - should return command line', () => {
        const testRunner = new runner.TestsRunner() as any;
        const res = testRunner.createSOAtestCommandLine(customOption);

        (path.normalize(res)).should.equal(path.normalize('"C:/Program Files/Parasoft/SOAtest_Virtualize/2022.1/soatestcli" -data "D:/soa-workspace/soatest" -config "builtin://Demo Configuration" -resource "TestAssets" -settings "localsettings.properties" -report "reports" -property "report.format=xml" -environment "testEvirontment" params'));
    });

    describe('createParasoftEnvironment', () => {
        it('should set PARASOFT_CONSOLE_ENCODING when it is not exist', () => {
            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.createParasoftEnvironment();

            (res.PARASOFT_CONSOLE_ENCODING).should.equal('utf-8');
        });

        it('should set PARASOFT_CONSOLE_ENCODING when it is not exist', () => {
            process.env.PARASOFT_CONSOLE_ENCODING = 'utf-8';

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.createParasoftEnvironment();

            (res.PARASOFT_CONSOLE_ENCODING).should.equal('utf-8');
        });
    });

    describe('findParasoftXmlReport()', () => {
        beforeEach(() => {
            process.env.GITHUB_WORKSPACE = __dirname;
        });

        const mockStatSync = (isDir: boolean, isFile: boolean) => {
            const xmlStats = {
                isDirectory: () => isDir,
                isFile: () => isFile
            };
            const reportStats = {
                mtime: {
                    getTime: () => 11
                }
            };
            const report1Stats = {
                mtime: {
                    getTime: () => 10
                }
            };

            const statStub = sandbox.stub(fs, 'statSync');
            // @ts-expect-error: Mock statSync
            statStub.onFirstCall().returns(xmlStats);
            // @ts-expect-error: Mock statSync
            statStub.onSecondCall().returns(reportStats);
            // @ts-expect-error: Mock statSync
            statStub.onThirdCall().returns(report1Stats);
        };

        it('should return undefined when file not exist', () => {
            const report = 'notFound.xml';
            const workingDir = __dirname;

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.findParasoftXmlReport(report, workingDir);

            if(res) {
                fail('res should be undefined', undefined);
            }
        });

        it('should return undefined when found no report', () => {
            const report = path.join(__dirname, 'report.xml');
            const workingDir = __dirname;
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            sandbox.replace(fs, 'readdirSync', sandbox.fake.returns([]));
            mockStatSync(false, true);

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.findParasoftXmlReport(report, workingDir);

            if(res) {
                fail('res should be undefined', undefined);
            }
        });

        it('should return the latest report when found multiple reports', () => {
            const report = path.join(__dirname, 'reports');
            const workingDir = __dirname;
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            // @ts-expect-error: Mock readdirSync
            sandbox.replace(fs, 'readdirSync', sandbox.fake.returns(['report.xml', 'report_1321321321.xml']));
            mockStatSync(true, false);

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.findParasoftXmlReport(report, workingDir);
            // path.join(__dirname, 'reports/report.xml') 提出来
            const expectedReportPath = path.join(__dirname, 'reports/report.xml');
            sinon.assert.calledWith(coreInfo, 'Found multiple Parasoft SOAtest XML reports and took the latest one: ' + path.normalize(expectedReportPath));
            (path.normalize(res)).should.equal(path.normalize(expectedReportPath));
        });

        it('should return the report when found only one report', () => {
            const report = path.join(__dirname, 'reports');
            const workingDir = __dirname;
            sandbox.replace(fs, 'existsSync', sandbox.fake.returns(true));
            // @ts-expect-error: Mock readdirSync
            sandbox.replace(fs, 'readdirSync', sandbox.fake.returns(['report.xml']));
            mockStatSync(true, false);

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.findParasoftXmlReport(report, workingDir);
            const expectedReportPath = path.join(__dirname, 'reports/report.xml');
            sinon.assert.calledWith(coreInfo, 'Found Parasoft SOAtest XML report file: ' + path.normalize(expectedReportPath));
            (path.normalize(res)).should.equal(path.normalize(expectedReportPath));
        });
    });

    it('convertReportWithJava()', async () => {
        const testRunner = new runner.TestsRunner() as any;
        await testRunner.convertReportWithJava('path/to/SOAtest/bundled/java', 'sourceReport.xml', 'report-xunit.xml', 'workspace');

        coreInfo.calledWithMatch(sinon.match('path/to/SOAtest/bundled/java'));
        coreInfo.calledWithMatch(sinon.match('-s:sourceReport.xml'));
        coreInfo.calledWithMatch(sinon.match('-o:report-xunit.xml'));
        coreInfo.calledWithMatch(sinon.match('pipelineBuildWorkingDirectory=workspace'));
    });

    describe('getSOAtestJavaPath()', () => {
        it('should return undefined when install dir does not exist', () => {

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.getSOAtestJavaPath('install/dir/does/not/exist');

            sinon.assert.calledWith(coreWarning, 'Unable to process the XML report using Java bundled with SOAtest because the SOAtest installation directory is missing');
            if (res) {
                fail('res should be undefined', undefined);
            }
        });

        it('should return undefined when SOAtest bundle java not found', () => {
            // @ts-expect-error: Mock which.sync
            sandbox.replace(which, 'sync', sandbox.fake.returns('soatestcli'));
            const testRunner = new runner.TestsRunner() as any;
            sandbox.replace(testRunner, 'doGetSOAtestJavaPath', sandbox.fake.returns(undefined));

            const res = testRunner.getSOAtestJavaPath(__dirname);

            sinon.assert.calledWith(coreWarning, 'Unable to process the XML report using Java bundled with SOAtest because it is missing');
            if (res) {
                fail('res should be undefined', undefined);
            }
        });

        it('should return java path when SOAtest bundle java found', () => {
            // @ts-expect-error: Mock which.sync
            sandbox.replace(which, 'sync', sandbox.fake.returns('soatestcli'));
            const testRunner = new runner.TestsRunner() as any;
            sandbox.replace(testRunner, 'doGetSOAtestJavaPath', sandbox.fake.returns('path/to/SOAtest/bundled/java'));

            const res = testRunner.getSOAtestJavaPath(__dirname);

            sinon.assert.calledWith(coreDebug, 'Found Java located at: path/to/SOAtest/bundled/java');
            (res).should.equal('path/to/SOAtest/bundled/java');
        });
    });

    describe('doGetSOAtestJavaPath()', () => {
        it('should return undefined when plugins folder not found', () => {
            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.doGetSOAtestJavaPath(__dirname);

            if (res) {
                fail('res should be undefined', undefined);
            }
        });

        it('should return undefined when no java found in plugins folder', () => {
            const fakeExistsSync = sandbox.fake.returns(true);
            sandbox.replace(fs, 'existsSync', fakeExistsSync);
            sandbox.replace(fs, 'readdirSync', sandbox.fake.returns([]));

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.doGetSOAtestJavaPath(__dirname);

            if (res) {
                fail('res should be undefined', undefined);
            }
            sinon.assert.calledWith(fakeExistsSync, path.join(__dirname, 'plugins'));
        });

        it('should return path when java found in plugins folder', () => {
            const javaFolder = ['com.parasoft.ptest.jdk.eclipse.core.web.1', 'com.parasoft.ptest.jdk.eclipse.core.web.2'].map(name => {
                const dirent = new fs.Dirent();
                dirent.name = name;
                sinon.stub(dirent, 'isDirectory').returns(true);
                return dirent;
            });

            // @ts-expect-error: Mock readdirSync
            sandbox.replace(fs, 'readdirSync', sandbox.fake.returns(javaFolder));
            const fakeExistsSync = sandbox.fake.returns(true);
            sandbox.replace(fs, 'existsSync', fakeExistsSync);

            const testRunner = new runner.TestsRunner() as any;
            const res = testRunner.doGetSOAtestJavaPath(__dirname);

            sinon.assert.calledWith(fakeExistsSync, path.join(__dirname, 'plugins', 'com.parasoft.ptest.jdk.eclipse.core.web.1', 'jdk', 'bin', os.platform() == 'win32' ? "java.exe" : "java"));
            res.should.not.be.undefined();
        });
    });
});