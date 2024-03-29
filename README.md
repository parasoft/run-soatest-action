# Run Parasoft SOAtest

[![Build](https://github.com/parasoft/run-soatest-action/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/parasoft/run-soatest-action/actions/workflows/build.yml)

This action enables you to run static analysis and execute tests with Parasoft SOAtest and review results on GitHub.

Parasoft SOAtest is an enterprise-grade solution that simplifies complex testing for business-critical transactions through APIs, message brokers, databases mainframes, ERPs, browser-based UIs, and other endpoints. SOAtest helps QA teams ensure secure, reliable, compliant business applications with an intuitive interface to create, maintain, and execute end-to-end testing scenarios.
- Request [a free trial](https://www.parasoft.com/products/parasoft-soatest/soatest-request-a-demo/) to receive access to Parasoft SOAtest's features and capabilities.
- See the [user guide](https://docs.parasoft.com/display/SOA20232) for information about Parasoft SOAtest's capabilities and usage.

Please visit the [official Parasoft website](http://www.parasoft.com) for more information about Parasoft SOAtest and other Parasoft products.

## Quick start

To run your Parasoft SOAtest and publish test results on GitHub, you need to customize your GitHub workflow to include:
- The action to run SOAtest.
- The action to upload the report in XML format to GitHub.

### Prerequisites
This action requires Parasoft SOAtest with a valid Parasoft license.

We recommend that you run Parasoft SOAtest on a self-hosted rather than GitHub-hosted runner.

### Adding the Run SOAtest Action to a GitHub Workflow
Add the `Run SOAtest` action to your workflow to launch test suites with Parasoft SOAtest.

At a minimum, the action requires the `soatestWorkspace` parameter to be configured to specify the path to a SOAtest workspace that determines the scope of analysis.

### Uploading Analysis Results to GitHub and reviewing the results
By default, the `Run SOAtest` action generates some reports in report directory. You can upload them by adding the upload-artifact action to your workflow.

We recommend that setting `convertReportToXUnit` parameter to true to generate an xUnit report in XML format. You can then upload it by adding the `Publish Test Results` action in your workflow and review the results on GitHub. See [Publish Test Results](https://github.com/marketplace/actions/publish-test-results) for details.

### Examples
The following examples demonstrate simple workflows consisting of one job for project building. The examples assume that SOAtest is running on a self-hosted runner and the path to the `soatestcli` executable is available in the `PATH`.

#### Run SOAtest with specified workspace

```yaml

# This is a basic workflow to help you get started with the Run SOAtest action.
name: Run SOAtest with specified workspace

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
    name: Run test suites with SOAtest
    # Specifies the type of runner that the job will run on.
    runs-on: self-hosted
    # Steps represent a sequence of tasks that will be executed as part of the job.
    steps:
    # Checks out your repository under $GITHUB_WORKSPACE, so that your job can access it.
    - name: Checkout repository
      uses: actions/checkout@v3

    # Execute the tests with SOAtest.
    - name: Run SOAtest
      id: SOAtest
      uses: parasoft/run-soatest-action@1.0.0
      with:
        #Specify a SOAtest workspace that determines the scope of analysis.
        soatestWorkspace: soatest

    # Upload the reports to GitHub as an artifact.
    - name: Upload report artifact
      uses: actions/upload-artifact@v2.2.3
      with:
        name: SOAtestReports # Artifact name
        path: /reports # Directory containing files to upload
```

## Configuring Analysis with SOAtest
You can configure analysis with Parasoft SOAtest in the following ways:
- By customizing the `Run SOAtest` action directly in your GitHub workflow. See [Action Parameters](#action-parameters) for a complete list of available parameters.
- By configuring options directly in Parasoft SOAtest tool. We recommend creating a `soatestcli.properties` file that includes all the configuration options and adding the file to SOAtest's working directory - typically, the root directory of your repository. This allows SOAtest to automatically read all the configuration options from that file. See [Parasoft SOAtest User Guide](https://docs.parasoft.com/display/SOA20232/Configuring+Settings) for details.

### Examples
This section includes practical examples of how to customize the `Run SOAtest` action directly in the YAML file of your workflow.

#### Configuring the Path to the SOAtest Installation Directory
If `soatestcli` executable is unavailable on `PATH`, you can configure the path to the installation directory of Parasoft SOAtest, by configuring the `installDir` parameter:

```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    installDir: '/opt/parasoft/SOAtest'
```

#### Defining the Scope for Analysis
You can configure the `soatestWorkspace` parameter to specify the path to a SOAtest workspace and configure the `resource` parameter to specify the test suite within the SOAtest workspace.

```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    soatestWorkspace: 'soatest'
    resource: 'TestAssets/TestSuite.tst'
```

#### Configuring a SOAtest Test Configuration
Test analysis with SOAtest is performed by using a test configuration. Parasoft SOAtest ships with a wide range of [built-in test configurations](https://docs.parasoft.com/display/SOAVIRT20232/Built-in+Test+Configurations).
To specify a test configuration directly in your workflow, add the `testConfig` parameter to the `Run SOAtest` action and specify the URL of the test configuration you want to use:
```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    testConfig: 'user://Example Configuration'
```

#### Specifying the report directory
Generating reports in a specific path or file:
```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    report: 'soatest/reports'
    #report: 'soatest/soatestReport.xml'
```

#### Importing configuration options
To specify a customize configuration file including SOAtest configuration options:
```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    settings: 'soatest/soatestcli.properties'
```

#### Conversion of the SOAtest report into the xUnit XML format
Enable to convert the SOAtest report to xUnit XML format:
```yaml
- name: Run SOAtest
  uses: parasoft/run-soatest-action@1.0.0
  with:
    convertReportToXUnit: 'true'
```

## Action Parameters
The following inputs are available for this action:
| Input | Description |
| --- | --- |
| `installDir` | Installation folder of Parasoft SOAtest. If not specified, the soatestcli executable must be added to `PATH`. |
| `soatestWorkspace` | Path to the SOAtest workspace directory. If not specified, `${{ github.workspace }}` will be used.|
| `testConfig` | Test configuration to be used for test execution. The default is `user://Example Configuration`.|
| `resource` | Relative path to the test suite(s) within the SOAtest workspace. The default is `TestAssets`|
| `settings`| Setting file used to configure execution preferences.|
| `reportFormat` | Format of reports from test execution. The default is `xml,html`.|
| `environment` | Name of the SOAtest environment to use for executing the tests.|
| `convertReportToXUnit` | Enables the conversion of the SOAtest report into the xUnit format. The default is `true`.|
| `additionalParams` | Additional parameters for the `soatestcli` executable. See [Parasoft SOAtest User Guide](https://docs.parasoft.com/display/SOA20232/CLI+Options#CLIOptions-OptionsReferences) for details.|