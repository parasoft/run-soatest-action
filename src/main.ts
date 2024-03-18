import * as core from "@actions/core";
import * as runner from './runner';
import { messages, messagesFormatter } from './messages'

export async function run() {
    try {
        const runOptions: runner.RunOptions = {
            installDir: core.getInput("installDir", { required: false }),
            workingDir: core.getInput("workingDir", { required: false }),
            testConfig: core.getInput("testConfig", { required: false }),
            resource: core.getInput("resource", { required: false }),
            settings: core.getInput("settings", { required: false }),
            report: core.getInput("report", { required: false }),
            reportFormat: core.getInput("reportFormat", { required: false }),
            environment: core.getInput("environment", { required: false }),
            additionalParams: core.getInput("additionalParams", { required: false }),
            convertReportToXunit: core.getBooleanInput("convertReportToXunit", { required: false }),
            javaRootPath: core.getInput("javaRootPath", { required: false })
        };

        core.info(messagesFormatter.format(messages.run_started, runOptions.workingDir));

        const theRunner = new runner.AnalysisRunner();
        let outcome = await theRunner.runSOATest(runOptions);

        if (outcome.exitCode != 0) {
            core.setFailed(messagesFormatter.format(messages.failed_run_non_zero, outcome.exitCode));
            return;
        }
        core.info(messagesFormatter.format(messages.exit_code, outcome.exitCode));
        if (runOptions.convertReportToXunit) {
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
        }
    }
}

if (require.main === module) {
    run();
}