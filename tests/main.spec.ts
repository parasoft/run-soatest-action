import * as main from "../src/main";
import * as assert from "assert";
import { describe, it } from "mocha";

describe('run-soatest-action/main', () => {
    it('add', () => {
        /*
        * This Comment will be removed in next pull request
        * About test lib:
        * - sinon is used for mocking
        * - mocha is used for test runner
        * - nyc is used for code coverage
        */
        assert.strictEqual(main.add(1, 2), 3);
    });
});