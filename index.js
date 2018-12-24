#!/usr/bin/env node --inspect-brk

/**
 * etcports entry point
 */

var { fork } = require('child_process');
var path = require('path');

fork(path.resolve(__dirname, './etcports.js'), process.argv.slice(2), { detached: true });

process.exit(0);
