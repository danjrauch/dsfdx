dsfdx
=====



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/dsfdx.svg)](https://npmjs.org/package/dsfdx)
[![Downloads/week](https://img.shields.io/npm/dw/dsfdx.svg)](https://npmjs.org/package/dsfdx)
[![License](https://img.shields.io/npm/l/dsfdx.svg)](https://github.com/danjrauch/dsfdx/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g dsfdx
$ dsfdx COMMAND
running command...
$ dsfdx (-v|--version|version)
dsfdx/0.0.0 darwin-x64 node-v11.5.0
$ dsfdx --help [COMMAND]
USAGE
  $ dsfdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`dsfdx auth`](#dsfdx-auth)
* [`dsfdx build`](#dsfdx-build)
* [`dsfdx help [COMMAND]`](#dsfdx-help-command)
* [`dsfdx list`](#dsfdx-list)
* [`dsfdx retrieve`](#dsfdx-retrieve)

## `dsfdx auth`

authorize a new environment

```
USAGE
  $ dsfdx auth

OPTIONS
  -a, --alias=alias  (required)
  -e, --env=env      (required)
  --devhub

ALIASES
  $ dsfdx a

EXAMPLE
  $ dsfdx auth -a some_name -e prod -devhub
```

_See code: [src/commands/auth.js](https://github.com/danjrauch/dsfdx/blob/v0.0.0/src/commands/auth.js)_

## `dsfdx build`

build code to some environment

```
USAGE
  $ dsfdx build

OPTIONS
  -a, --alias=alias  (required)
  -d, --dir=dir
  -e, --env=env      (required)
  -n, --new

ALIASES
  $ dsfdx b

EXAMPLE
  $ dsfdx build -a some_name -e dev -d ../../folder/project -n
```

_See code: [src/commands/build.js](https://github.com/danjrauch/dsfdx/blob/v0.0.0/src/commands/build.js)_

## `dsfdx help [COMMAND]`

display help for dsfdx

```
USAGE
  $ dsfdx help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.0/src/commands/help.ts)_

## `dsfdx list`

list all environments

```
USAGE
  $ dsfdx list

ALIASES
  $ dsfdx l

EXAMPLE
  $ dsfdx list
```

_See code: [src/commands/list.js](https://github.com/danjrauch/dsfdx/blob/v0.0.0/src/commands/list.js)_

## `dsfdx retrieve`

retrieve code from some environment

```
USAGE
  $ dsfdx retrieve

OPTIONS
  -a, --alias=alias  (required)
  -d, --dir=dir
  -e, --env=env      (required)

ALIASES
  $ dsfdx r

EXAMPLE
  $ dsfdx retrieve -a some_name -d ../../folder/project
```

_See code: [src/commands/retrieve.js](https://github.com/danjrauch/dsfdx/blob/v0.0.0/src/commands/retrieve.js)_
<!-- commandsstop -->
