import * as fs from 'fs';
import * as pt from 'path';
import format = require('string-format');

interface ISerializable<T> {
    deserialize(jsonPath: string): T;
}

class Messages implements ISerializable<Messages> {
    run_started!: string;
    run_failed!: string;
    exit_code!: string;
    failed_run_non_zero!: string;
    wrk_dir_not_exist!: string;
    can_not_process_soatest_report!: string;
    converting_soatest_report_to_xunit!: string;
    converted_xunit_report!: string;
    use_nodejs_to_convert_report!: string;
    using_java_to_convert_report!: string;

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