import * as cp from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as pt from 'path';
import * as core from "@actions/core";
import * as which from 'which';
import { messages, messagesFormatter } from './messages';

export interface RunDetails {
    exitCode : number
}

export interface RunOptions {
    /* Installation folder of Parasoft SOAtest. */
    installDir: string;

    /* Working directory for running SOAtest. */
    workingDir: string;

    /* Test configuration to be used for test execution. */
    testConfig: string;

    /* Specify a path to output folder or a file for the test execution reports. */
    report: string;

    /* Specify a .properties file. */
    settings: string;

    /* Specify the test suite(s) to run. */
    resource: string;

    /* Format of test execution reports. */
    reportFormat: string;

    /* Specify a .env file. */
    environment: string;

    /* Convert Parasoft SOAtest report to XUnit format. */
    convertReportToXUnit: boolean; 

    /* Additional parameters for soatestcli executable. */
    additionalParams: string;
}

export class TestsRunner {
    async runSOAtest(runOptions : RunOptions) : Promise<RunDetails> {
        if (!fs.existsSync(runOptions.workingDir)) {
            return Promise.reject(messagesFormatter.format(messages.wrk_dir_not_exist, runOptions.workingDir));
        }
        const commandLine = this.createSOAtestCommandLine(runOptions).trim();
        core.info(commandLine);

        const runPromise = new Promise<RunDetails>((resolve, reject) => {
            const cliEnv = this.createParasoftEnvironment();
            const cliProcess = cp.spawn(`${commandLine}`, { cwd: runOptions.workingDir, env: cliEnv, shell: true, windowsHide: true });
            this.handleCliProcess(cliProcess, resolve, reject);
        });

        return runPromise;
    }

    async convertReportToXUnit(runOptions: RunOptions): Promise<RunDetails> {
        const parasoftXmlReportPath = this.findParasoftXmlReport(runOptions.report, runOptions.workingDir);
        if (!parasoftXmlReportPath) {
            return Promise.reject(messagesFormatter.format(messages.soatest_report_not_found, runOptions.report));
        }

        const xunitPath = parasoftXmlReportPath.substring(0, parasoftXmlReportPath.lastIndexOf('.xml')) + '-xunit.xml';
        
        core.info(messagesFormatter.format(messages.converting_soatest_report_to_xunit, parasoftXmlReportPath));
        const javaPath = this.getSOAtestJavaPath(runOptions.installDir);

        if (!javaPath) {
            return {exitCode: -1};
        }

        const exitCode = (await this.convertReportWithJava(javaPath, parasoftXmlReportPath, xunitPath, runOptions.workingDir)).exitCode;
        if (exitCode == 0) {
            core.info(messagesFormatter.format(messages.converted_xunit_report, xunitPath));
        }

        return {exitCode: exitCode};
    }

    private createSOAtestCommandLine(runOptions : RunOptions) : string {
        let soatestcli = 'soatestcli';

        if (runOptions.installDir) {
            soatestcli = `"${pt.join(runOptions.installDir, soatestcli)}"`;
        }

        let commandLine = soatestcli;

        if (runOptions.workingDir) {
            commandLine += ` -data "${runOptions.workingDir}"`;
        }

        if (runOptions.testConfig) {
            commandLine += ` -config "${runOptions.testConfig}"`;
        }

        if (runOptions.resource) {
            commandLine += ` -resource "${runOptions.resource}"`;
        }

        if (runOptions.settings) {
            commandLine += ` -settings "${runOptions.settings}"`;
        }

        if (runOptions.report) {
            commandLine += ` -report "${runOptions.report}"`;
        }

        if (runOptions.reportFormat) {
            commandLine += ` -property "report.format=${runOptions.reportFormat}"`;
        }

        if (runOptions.environment) {
            commandLine += ` -environment "${runOptions.environment}"`;
        }

        if (runOptions.additionalParams) {
            commandLine += ` ${runOptions.additionalParams}`;
        }

        return commandLine;
    }

    private createParasoftEnvironment() : NodeJS.ProcessEnv {
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

    private findParasoftXmlReport(report: string, workingDir: string) : string | undefined {
        const getReportPath = function (report: string) : string | undefined {
            if (!fs.existsSync(report)) {
                return undefined;
            }

            const stats = fs.statSync(report);
            if (stats.isFile()) {
                report = report.replace(report.substring(report.lastIndexOf('.')), '.xml');
                if (fs.existsSync(report)) {
                    core.info(messagesFormatter.format(messages.found_xml_report, report));
                    return report;
                }
                return undefined;
            }

            if (stats.isDirectory()) {
                core.info(messagesFormatter.format(messages.try_to_find_xml_report_in_folder, report));
                report = pt.join(report, 'report.xml');
                if (fs.existsSync(report)) {
                    core.info(messagesFormatter.format(messages.found_xml_report, report));
                    return report;
                }
            }
        };

        // with absolute path
        if (pt.isAbsolute(report)) {
            core.info(messages.find_xml_report);
            return getReportPath(report);
        // with relative path
        } else {
            core.info(messagesFormatter.format(messages.find_xml_report_in_working_directory , workingDir, report));
            report = pt.join(workingDir, report);
            return getReportPath(report);
        }
    }

    private async convertReportWithJava(javaPath: string, sourcePath: string, outPath: string, defaultWorkingDirectory: string) : Promise<RunDetails>
    {
        core.info(messagesFormatter.format(messages.using_java_to_convert_report, javaPath));
        // Transform with java
        const jarPath = pt.join(__dirname, "SaxonHE12-2J/saxon-he-12.2.jar");
        const xslPath = pt.join(__dirname, "soatest-xunit.xsl");

        const commandLine = `"${javaPath}" -jar "${jarPath}" -s:"${sourcePath}" -xsl:"${xslPath}" -o:"${outPath}" -versionmsg:off pipelineBuildWorkingDirectory="${defaultWorkingDirectory}"`;
        core.info(commandLine);

        return await new Promise<RunDetails>((resolve, reject) => {
            const cliProcess = cp.spawn(`${commandLine}`, {shell: true, windowsHide: true });
            this.handleCliProcess(cliProcess, resolve, reject);
        });
    }

    private handleCliProcess(cliProcess, resolve, reject) {
        cliProcess.stdout?.on('data', (data) => { core.info(`${data}`.replace(/\s+$/g, '')); });
        cliProcess.stderr?.on('data', (data) => { core.info(`${data}`.replace(/\s+$/g, '')); });
        cliProcess.on('close', (code) => {
            const result : RunDetails = {
                exitCode : (code != null) ? code : 150 // 150 = signal received
            };
            resolve(result);
        });
        cliProcess.on("error", (err) => { reject(err); });
    }

    private getSOAtestJavaPath(installDir: string): string | undefined {
        let javaFilePath;
        if (installDir && fs.existsSync(installDir)) {
            javaFilePath = this.doGetSOAtestJavaPath(installDir);
        } else {
            try {
                const soatestcliPath = which.sync('soatestcli');
                installDir = soatestcliPath.substring(0, soatestcliPath.lastIndexOf('soatestcli') - 1);
                javaFilePath = this.doGetSOAtestJavaPath(installDir);
            } catch (error) {
                core.warning(messages.soatest_install_dir_not_found);
                javaFilePath = undefined;
            }
        }

        if (!javaFilePath) {
            core.warning(messages.java_not_found_in_soatest_install_dir);
        } else {
            core.info(messagesFormatter.format(messages.found_java_at, javaFilePath));
        }
        return javaFilePath;
    }

    private doGetSOAtestJavaPath(installDir: string): string | undefined {
        core.info(messagesFormatter.format(messages.find_java_in_soatest_install_dir, installDir));

        const pluginsPath = pt.join(installDir, 'plugins');
        if (!fs.existsSync(pluginsPath)) {
            return undefined;
        }

        const pluginPaths = fs.readdirSync(pluginsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('com.parasoft.ptest.jdk.eclipse.core.web.'))
            .map(dirent => pt.join(pluginsPath, dirent.name));

        if (pluginPaths.length != 1) {
            return undefined;
        }

        const jdkRootPath = pt.join(pluginPaths[0], 'jdk');

        const javaFileName = os.platform() == 'win32' ? "java.exe" : "java";
        const javaFilePath = pt.join(jdkRootPath, "bin", javaFileName);

        if (!fs.existsSync(javaFilePath)) {
            return undefined;
        }

        return javaFilePath;
    }
}