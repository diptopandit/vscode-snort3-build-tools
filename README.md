# Snort3 Build Tools for Visual Studio Code

Snort3 Build Tools is a visual studio code extension that lets you configure and build snort3 Visual Studio Code easily. This extention will activate when there is a snort3 folder open in the workspace and will provide options to configure and build the souce.

## Setup

* install the [Snort3 Build Tools](https://marketplace.visualstudio.com/items?itemName=diptopandit.snort3-test-adapter) extension
* open any workspace in visual studio code that has snort3 folder.

## Configuration

_The extension configurations are best suited for workspace. Make sure to modify them in workspace scope._

* open extension settings 
* set `Snort Install Dir` to snort install path
* (optional) set `Snort Build Dir` to snort build working directory path
* (optional) set `Concurrency` to number of parallel jobs. This value will be set to number of processors if left blank.
* (optional) choose `Default Target` from 'REG_TEST' and 'OPEN_SRC'. Default is 'REG_TEST'.
* set `Dependencies` to dependencies (libdaq, abcip, cpputest etc.) installation path.

The dependency directory structure should be like below:
```
    dependency_directory
    |
    +- abcip
    |  +- bin
    |  +- lib
    |  +- share
    |
    +- cpputest
    |  +- include
    |  +- lib64
    |
    +- libdaq
    |  +- bin
    |  +- include
    |  +- lib
    |
    +- safec
       +- include
       +- lib
```
You should now see the below items in status bar:

![status bar items](https://raw.githubusercontent.com/diptopandit/vscode-snort3-build-tools/main/img/status-items.png)

Clicking on the icons will trigger the below commands respectively. The icons will animate when the task is in progress.

## Commands

This extension provides three commands:
* build: configure snort3
* build: build snort3
* build: clean snort3 build

![registered commands](https://raw.githubusercontent.com/diptopandit/vscode-snort3-build-tools/main/img/commands.png)

## Key bindings

The following default key bindings are provided, which can be modified as per convenience
* `^ + ⇧ + c` Configure selected target
* `^ + ⇧ + b` Build selected target
* `^ + ⇧ + l` Clean
* `^ + ⇧ + t` Select target

## Contributing

We encourange to find and submit issues. Please provide enogh information while submitting new issues, including but not limited to 'Repro Steps', 'Expected Behavour' and 'Actual Behaviour'.

- For enhancements, please create issue and get it approved before submitting pull requests.
- Please mention issue number in pull requests

Contributions are most welcome.

