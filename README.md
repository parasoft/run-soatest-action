# Run Parasoft SOAtest

[![Build](https://github.com/parasoft/run-soatest-action/actions/workflows/build.yml/badge.svg)](https://github.com/parasoft/run-soatest-action/actions/workflows/build.yml)
[![CodeQL](https://github.com/parasoft/run-soatest-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/parasoft/run-soatest-action/actions/workflows/codeql-analysis.yml)
[![Test](https://github.com/parasoft/run-soatest-action/actions/workflows/test.yml/badge.svg)](https://github.com/parasoft/run-soatest-action/actions/workflows/test.yml)

This action enables you to run functional tests with Parasoft SOAtest and review results directly on GitHub.

Parasoft SOAtest is a testing tool that automates thorough testing for composite applications with robust support for REST and web services, including over 120 protocols/message types. It is an enterprise-grade solution that simplifies complex testing for business-critical transactions through APIs, message brokers, databases, ERPs, browser-based UIs, and other endpoints.
- Request [a demo](https://www.parasoft.com/products/parasoft-soatest/soatest-request-a-demo/) to see an overview of Parasoft SOAtest's features and benefits.
- See the [user guide](https://docs.parasoft.com/display/SOA20232) for information about Parasoft SOAtest's capabilities and usage.

Please visit the [official Parasoft website](http://www.parasoft.com) for more information about Parasoft SOAtest and other Parasoft products.

## Quick start

To run your Parasoft SOAtest and review test results on GitHub, you need to customize your GitHub workflow to include:
- The action to run SOAtest.
- The action to publish the transformed xUnit report to GitHub.

### Prerequisites
This action requires Parasoft SOAtest with a valid Parasoft license.

We recommend that you run Parasoft SOAtest on a self-hosted rather than GitHub-hosted runner.

### Adding the Run SOAtest Action to a GitHub Workflow
Add the `Run SOAtest` action to your workflow to run test suites with Parasoft SOAtest.

The following examples demonstrate simple workflows consisting of one job to run test suites with SOAtest. The examples assume that SOAtest is running on a self-hosted runner and the path to the `soatestcli` executable is available in the `PATH`.

```yaml
# This is a basic workflow to help you get started with the Run SOAtest action.
name: Run SOAtest

on:
  # Trigger the workflow on push or pull request events but only for the main branch.
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

  # Allows you to run this workflow manually from the Actions tab.
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel.
jobs:
  build:
    # Specifies the name of the job.
    name: Run test suites with SOAtest

    # Specifies required permissions for upload-sarif action
    permissions:
      # required for all workflows
      security-events: write
      # only required for workflows in private repositories
      actions: read
      contents: read

    # Specifies the type of runner that the job will run on.
    runs-on: self-hosted

    # Steps represent a sequence of tasks that will be executed as part of the job.
    steps:
      # Checks out your repository under $GITHUB_WORKSPACE, so that your job can access it.
      - name: Checkout repository
        uses: actions/checkout@v4

      # Execute the tests with SOAtest.
      - name: Run SOAtest
        uses: parasoft/run-soatest-action@1.0.0
        with:
          #Specify a SOAtest workspace that determines the scope of test execution.
          soatestWorkspace: 'path/to/soatest/workspace'
```

### Uploading Test Results to GitHub
By default, the `convertReportToXUnit` parameter is set to true. This action generates XML report and converts to xUnit report. You can upload the test reports in the following ways:
- Upload the XML report to GitHub as an artifact.
- Publish the results with another action which reads the converted xUnit report to review the results on GitHub. We recommend using `Publish Test Results` and `Test Reporter` to publish the results to GitHub.

#### Upload the reports to GitHub as an artifact
Example
```yaml
- name: Upload report artifact
  uses: actions/upload-artifact@v4
  with:
    name: SOAtestReports # Artifact name
    path: /reports # Directory containing files to upload
```

#### Publish Test Results
Prerequisites
- A Python3 environment needs to be set up on the action runner if Docker is not provided. See [Running as a non-Docker action](https://github.com/marketplace/actions/publish-test-results#running-as-a-non-docker-action) for details.

Example
```yaml
jobs:
  publish:
    runs-on: windows-latest

    permissions:
      # Minimal workflow job permissions required by this action in public GitHub repositories
      checks: write
      pull-requests: write
  
      # The following permissions are required in private GitHub repositories
      contents: read
      issues: read

    steps:
      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action/windows@v2
        with:
        files: |
          reports/report-xunit.xml
```
See [Publish Test Results](https://github.com/marketplace/actions/publish-test-results) for details.

#### Test Reporter
Example
```yaml
jobs:
  report:
    runs-on: ubuntu-latest

    permissions:
      # Minimal workflow job permissions required by this action in public GitHub repositories
      actions: read
      checks: write
  
      # The following permissions are required in private GitHub repositories
      contents: read

    steps:
      - name: Test Report
        uses: dorny/test-reporter@v1
        with:
          name: 'xUnit Tests'                # Name of the check run which will be created
          path: 'reports/report-xunit.xml'   # Path to test results
          reporter: 'java-junit'             # Format of test results
```
See [Test Reporter](https://github.com/marketplace/actions/test-reporter) for details.

## Configuring Test Execution with SOAtest
You can configure the test execution with Parasoft SOAtest in the following ways:
- By customizing the `Run SOAtest` action directly in your GitHub workflow. See [Action Parameters](#action-parameters) for a complete list of available parameters.
- By configuring options directly in Parasoft SOAtest tool. We recommend creating a `soatestcli.properties` file that includes all the configuration options and adding the file to SOAtest's working directory - typically, the root directory of your repository. This allows SOAtest to automatically read all the configuration options from that file. See [Parasoft SOAtest User Guide](https://docs.parasoft.com/display/SOA20232/Configuring+Settings) for details.

### Examples
This section includes practical examples of how to customize the `Run SOAtest` action directly in the YAML file of your workflow.

#### Configuring the Path to the SOAtest Installation Directory
If `soatestcli` executable is unavailable on `PATH`, you can configure the path to the installation directory of Parasoft SOAtest by configuring the `installDir` parameter:

```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    installDir: '/opt/parasoft/SOAtest'
```

#### Defining the Scope for test execution
You can configure the `soatestWorkspace` parameter to specify the path to a SOAtest workspace and configure the `resource` parameter to specify the test suite within the SOAtest workspace.

```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    soatestWorkspace: 'path/to/soatest/workspace'
    resource: 'TestAssets/TestSuite.tst'
```

#### Configuring a SOAtest Test Configuration
Test execution with SOAtest is performed by using a test configuration. Parasoft SOAtest ships with a wide range of [built-in test configurations](https://docs.parasoft.com/display/SOA20232/Built-in+Test+Configurations).
To specify a test configuration directly in your workflow, add the `testConfig` parameter to the `Run SOAtest` action and specify the URL of the test configuration you want to use:
```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    testConfig: 'user://Example Configuration'
```

#### Conversion of the SOAtest report into the xUnit XML format
Enable to convert the SOAtest report to xUnit XML format:
```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    convertReportToXUnit: true
```

## Action Parameters
The following inputs are available for this action:
| Input | Description |
| --- | --- |
| `installDir` | Installation folder of Parasoft SOAtest. If not specified, the soatestcli executable must be added to `PATH`. |
| `soatestWorkspace` | Path to the SOAtest workspace directory. If not specified, `${{ github.workspace }}` will be used.|
| `testConfig` | Test configuration to be used for test execution. The default is `user://Example Configuration`.|
| `resource` | Relative path to the test suite(s) within the SOAtest workspace. The default is `TestAssets`.|
| `settings`| Setting file used to configure execution preferences.|
| `report` | The path to output folder or a file for the test execution report.|
| `reportFormat` | Format of reports from test execution. The default is `xml,html`.|
| `environment` | Name of the SOAtest environment to use for executing the tests.|
| `convertReportToXUnit` | Enables the conversion of the SOAtest report into the xUnit format. The default is `true`.|
| `additionalParams` | Additional parameters for the `soatestcli` executable. See [Parasoft SOAtest User Guide](https://docs.parasoft.com/display/SOA20232/CLI+Options#CLIOptions-OptionsReferences) for details.|