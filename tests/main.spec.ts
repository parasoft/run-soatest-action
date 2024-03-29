import * as sinon from "sinon"
import * as main from "../src/main";
import * as core from "@actions/core";
import * as runner from "../src/runner";

describe('run-soatest-action/main', () => {
    const sandbox = sinon.createSandbox();

    let coreSetFailed : sinon.SinonSpy;
    let coreInfo : sinon.SinonSpy;
    let coreError : sinon.SinonSpy;
    let fakeSOARunner : sinon.SinonSpy;
    let fakeXunitRunner : sinon.SinonSpy;

    let customOption : runner.RunOptions;
    let runnerExitCode: any;

    const fakeGetInput = (key): string => {
        switch (key) {
            case "installDir":
                return customOption.installDir;
            case "soatestWorkspace":
                return customOption.soatestWorkspace;
            case "testConfig":
                return customOption.testConfig;
            case "resource":
                return customOption.resource;
            case "settings":
                return customOption.settings;
            case "report":
                return customOption.report;
            case "reportFormat":
                return customOption.reportFormat;
            case "environment":
                return customOption.environment;
            case "additionalParams":
                return customOption.additionalParams;
            default:
                return '';
        }
    }

    const fakeGetBooleanInput = (key): boolean => {
        switch (key) {
            case "convertReportToXUnit":
                return customOption.convertReportToXUnit;
            default:
                return true;
        }
    }

    beforeEach(() => {
        coreSetFailed = sandbox.fake();
        sandbox.replace(core, 'setFailed', coreSetFailed);
        coreInfo = sandbox.fake();
        sandbox.replace(core, 'info', coreInfo);
        coreError = sandbox.fake();
        sandbox.replace(core, 'error', coreError);
        sandbox.replace(core, 'getInput', fakeGetInput);
        sandbox.replace(core, 'getBooleanInput', fakeGetBooleanInput);
        runnerExitCode = {
            soaRunner: 0,
            xUnitRunner: 0
        }
        customOption = {
            installDir: "C:/Program Files/Parasoft/SOAtest_Virtualize/2022.1",
            soatestWorkspace: "D:/soa-workspace",
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

    const setUpFakeRunner = () => {
        fakeSOARunner = sandbox.fake.resolves({ exitCode: runnerExitCode.soaRunner });
        sandbox.replace(runner.TestsRunner.prototype, 'runSOAtest', fakeSOARunner);
        fakeXunitRunner = sandbox.fake.resolves({ exitCode: runnerExitCode.xUnitRunner });
        sandbox.replace(runner.TestsRunner.prototype, 'convertReportToXUnit', fakeXunitRunner);
    }

    it('Get RunOption from input ', async () => {
        setUpFakeRunner();

        await main.run();

        sinon.assert.calledWith(fakeSOARunner, customOption);
        sinon.assert.calledWith(coreInfo, 'SOAtest run finished with code 0');
    });

    it('Run SOAtest Cli with non-zero exit code', async () => {
        runnerExitCode.soaRunner = 1;
        setUpFakeRunner();

        await main.run();

        sinon.assert.calledWith(coreSetFailed, 'SOAtest run failed with a non-zero exit code: 1');
    });

    it('Run report conversion with non-zero exit code', async () => {
        runnerExitCode.xUnitRunner = 1;
        setUpFakeRunner();

        await main.run();

        sinon.assert.calledWith(coreSetFailed, 'Report conversion failed with a non-zero exit code: 1');
    });

    it('Error happen', async () => {
        fakeSOARunner = sandbox.fake.throws(new Error('Error message'));
        sandbox.replace(runner.TestsRunner.prototype, 'runSOAtest', fakeSOARunner);

        await main.run();

        sinon.assert.calledWith(coreError, 'Run failed');
        sinon.assert.calledWith(coreSetFailed, 'Error message');
    });
});