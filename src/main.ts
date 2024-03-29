import * as core from "@actions/core";
import * as runner from './runner';
import { messages, messagesFormatter } from './messages'

export async function run() {
    try {
        const runOptions: runner.RunOptions = {
            installDir: core.getInput("installDir", { required: false }),
            soatestWorkspace: core.getInput("soatestWorkspace", { required: false }),
            testConfig: core.getInput("testConfig", { required: false }),
            resource: core.getInput("resource", { required: false }),
            settings: core.getInput("settings", { required: false }),
            report: core.getInput("report", { required: false }),
            reportFormat: core.getInput("reportFormat", { required: false }),
            environment: core.getInput("environment", { required: false }),
            convertReportToXUnit: core.getBooleanInput("convertReportToXUnit", { required: false }),
            additionalParams: core.getInput("additionalParams", { required: false })
        };

        const theRunner = new runner.TestsRunner();
        let outcome = await theRunner.runSOAtest(runOptions);

        if (outcome.exitCode != 0) {
            core.setFailed(messagesFormatter.format(messages.failed_run_non_zero, outcome.exitCode));
            return;
        }
        core.info(messagesFormatter.format(messages.exit_code, outcome.exitCode));
        if (runOptions.convertReportToXUnit) {
            outcome = await theRunner.convertReportToXUnit(runOptions);
        }
        if (outcome.exitCode != 0) {
            core.setFailed(messagesFormatter.format(messages.failed_convert_report, outcome.exitCode));
        }
    } catch (error) {
        core.error(messages.run_failed);
        if (error instanceof Error) {
            core.error(error);
            core.setFailed(error.message);
        } else if (typeof error === 'string' || error instanceof String){
            core.setFailed(error.toString());
        } else {
            core.setFailed(`Unknown error: ${error}`);
        }
    }
}

if (require.main === module) {
    run();
}