import * as fs from 'fs';
import * as pt from 'path';
import * as format from 'string-format';

interface ISerializable<T> {
    deserialize(jsonPath: string): T;
}

class Messages implements ISerializable<Messages> {
    run_started!: string;
    run_failed!: string;
    exit_code!: string;
    failed_run_non_zero!: string;
    work_dir_not_exist!: string;
    soatest_workspace_dir_not_exist!: string;
    found_xml_report!: string;
    try_to_find_xml_report_in_folder!: string;
    find_xml_report!: string;
    find_xml_report_in_working_directory!: string;
    found_multiple_reports_and_use_the_latest_one!: string;
    soatest_report_not_found!: string;
    converting_soatest_report_to_xunit!: string;
    converted_xunit_report!: string;
    using_java_to_convert_report!: string;
    failed_convert_report!: string;
    soatest_install_dir_not_found!: string;
    java_not_found_in_soatest_install_dir!: string;
    found_java_at!: string;
    find_java_in_soatest_install_dir!: string;

    deserialize(jsonPath: string) : Messages {
        const buf = fs.readFileSync(jsonPath);
        const json = JSON.parse(buf.toString('utf-8'));
        return json as Messages;
    }
}

class Formatter {
    format(template: string, ...args: any[]): string {
        return format(template, ...args);
    }
}

const jsonPath = pt.join(__dirname, 'messages/messages.json');
export const messages = new Messages().deserialize(jsonPath);
export const messagesFormatter = new Formatter();