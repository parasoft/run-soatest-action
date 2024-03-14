import * as cp from 'child_process';
import * as fs from 'fs';
import * as pt from 'path';
import * as core from "@actions/core";

import { messages } from './messages'

export interface RunDetails {
    exitCode : number
}

export interface RunOptions {
    /* Installation folder of Parasoft SOAtest. */
    installDir: string;

    /* Working directory for running SOAtest. */
    workingDir: string;

    /* Test configuration to be used when running code analysis. */
    testConfig: string;

    /* Output folder for analysis reports. */
    reportDir: string;

    /* Specify a .properties file. */
    settings: string;

    /* Specify the test suite(s) to run. */
    resource: string;

    /* Format of analysis reports. */
    reportFormat: string;

    /* Specify a .env file. */
    environment: string;

    /* Additional parameters for soatestcli executable. */
    additionalParams: string;
}

export class AnalysisRunner {
    async run(runOptions : RunOptions) : Promise<RunDetails> {
        if (!fs.existsSync(runOptions.workingDir)) {
            return Promise.reject(messages.wrk_dir_not_exist + runOptions.workingDir);
        }
        const commandLine = this.createCommandLine(runOptions).trim();
        if (commandLine.length === 0) {
            return Promise.reject(messages.cmd_cannot_be_empty);
        }

        core.info(commandLine);

        const runPromise = new Promise<RunDetails>((resolve, reject) => {
            const cliEnv = this.createEnvironment();
            const cliProcess = cp.spawn(`${commandLine}`, { cwd: runOptions.workingDir, env: cliEnv, shell: true, windowsHide: true });

            cliProcess.stdout?.on('data', (data) => { core.info(`${data}`.replace(/\s+$/g, '')); });
            cliProcess.stderr?.on('data', (data) => { core.info(`${data}`.replace(/\s+$/g, '')); });
            cliProcess.on('close', (code) => {
                const result: RunDetails = {
                    exitCode: (code != null) ? code : 150 // 150 = signal received
                };
                resolve(result);
            });
            cliProcess.on("error", (err) => { reject(err); });
        });

        return runPromise;
    }

    private createCommandLine(runOptions : RunOptions) : string {
        let soatestcli = 'soatestcli';
        let environment = ''

        if (runOptions.installDir) {
            soatestcli = '"' + pt.join(runOptions.installDir, soatestcli) + '"';
        }
        if (runOptions.environment) {
            environment = '-environment "' + runOptions.environment + '"';
        }

        const commandLine = "${soatestcli} -config \"${testConfig}\" -property report.format=${reportFormat} -report \"${reportDir}\" -data \"${workingDir}\" -resource \"${resource}\" -settings \"${settings}\" ${environment} ${additionalParams}".
        replace('${soatestcli}', `${soatestcli}`).
        replace('${workingDir}', `${runOptions.workingDir}`).
        replace('${installDir}', `${runOptions.installDir}`).
        replace('${testConfig}', `${runOptions.testConfig}`).
        replace('${reportDir}', `${runOptions.reportDir}`).
        replace('${reportFormat}', `${runOptions.reportFormat}`).
        replace('${settings}', `${runOptions.settings}`).
        replace('${resource}', `${runOptions.resource}`).
        replace('${environment}', `${environment}`).
        replace('${additionalParams}', `${runOptions.additionalParams}`);

        return commandLine;
    }

    private createEnvironment() : NodeJS.ProcessEnv {
        const environment: NodeJS.ProcessEnv = {};
        let isEncodingVariableDefined = false;
        for (const varName in process.env) {
            if (Object.prototype.hasOwnProperty.call(process.env, varName)) {
                environment[varName] = process.env[varName];
                if (varName.toLowerCase() === 'parasoft_console_encoding') {
                    isEncodingVariableDefined = true;
                }
            }
        }
        if (!isEncodingVariableDefined) {
            environment['PARASOFT_CONSOLE_ENCODING'] = 'utf-8';
        }
        return environment;
    }
}