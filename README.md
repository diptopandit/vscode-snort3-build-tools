

# Snort3 Build Tools for Visual Studio Code

Snort3 Build Tools is a visual studio code extension that lets you configure and build snort3 Visual Studio Code easily. This extension will activate when there is a snort3 folder open in the workspace and will provide options to configure and build the source.

## Setup

* install the [Snort3 Build Tools](https://marketplace.visualstudio.com/items?itemName=diptopandit.snort3-test-adapter) extension
* open any workspace in visual studio code that has snort3 folder.

## Configuration

_The extension configurations are best suited for workspace. Make sure to modify them in workspace scope._

* open extension settings 
* set `Snort Install Dir` to snort install path
* set `Dependencies Dir` to dependencies (libdaq, abcip, cpputest etc.) installation path.

#### Targets:
|Name|Description|
|--|--|
|`REG_TEST`|Configure and Build snort3 for running regression tests|
|`OPN_SRC`|Configure and Build snort3 for current environment|


### List of Configurations
| Group | Configuration | Type |Description | Default Value|
|--|--|--|--|--|
|  |Log Commands|boolean|Prints the command being executed in the terminal|`false`|
|  |Default Target| string|Default configuration target, either `REG_TEST` or `OPN_SRC`|`REG_TEST`|
|`environment`|Snort Install Dir|string|Absolute path to the snort install directory|**Must set before use**|
|`environment`|Dependencies Dir|string|Absolute path to the dependencies directory|**Must set before use**|
|`environment`|Snort Build Dir|string|Absolute path to snort build working directory|_optional_|
|`environment`|Concurrency|number|Number of concurrent jobs|`0` _(implies number of processor)_|
|`configOption`|Enable Sanitiser|boolean|Enable address or thread sanitisation|`true`|
|`configOption`|Sanitiser|string|Sanitiser to use for regtest if sanitisation is enabled either `address` or `thread` |`address`|
|`configOption`|Enable Debug|boolean|Enable debug support _(-\-enable-debug)_|`true`|
|`configOption`|Debug Message|boolean|Enable debug messages _(-\-enable-debug-msg)_|`true`|
|`configOption`|Enable Shell|boolean|Enable snort3 shell _(-\-enable-shell)_|`true`|
|`configOption`|Enable App Id|boolean|Enable third-party AppID _(-\-enable-appid-third-party)_|`true`|
|`configOption`|Enable Piglet|boolean|Enable piglet _(-\-enable-piglet)_|`true`|
|`configOption`|Enable Code Coverage|boolean|Enable code coverage if the target and sanitisation supports _(-\-enable-code-coverage)_|`true`|

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

We encourage to find and submit issues. Please provide enough information while submitting new issues, including but not limited to 'Repro Steps', 'Expected Behaviour' and 'Actual Behaviour'.

- For enhancements, please create issue and get it approved before submitting pull requests.
- Please mention issue number in pull requests

Contributions are most welcome.
