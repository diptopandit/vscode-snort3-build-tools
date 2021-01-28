# Snort3 Build Tools for Visual Studio Code

Snort3 Build Tools is a visual studio code extension that lets you configure and build snort3 Visual Studio Code easily. This extention will activate when there is a snort3 folder open in the workspace and will provide options to configure and build the souce.

## Setup

* install the [Snort3 Build Tools](https://marketplace.visualstudio.com/items?itemName=diptopandit.snort3-test-adapter) extension
* open any workspace in visual studio code that has snort3 folder.

## Configuration

* open extension settings 
* set `sf_prefix_snort3` to snort install path
* (optional) set `snort_build_dir` to snort build working directory path
* (optional) set `concurrency` to number of parallel jobs. This value will be set to number of processors if left blank.
* set `dependencies` to dependencies (libdaq, abcip, cpputest etc.) installation path.

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

This extension provides two commands:
* build: configure snort3
* build: build snort3

![registered commands](https://raw.githubusercontent.com/diptopandit/vscode-snort3-build-tools/main/img/commands.png)

Contributions are welcome
