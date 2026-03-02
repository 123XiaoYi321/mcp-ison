#!/usr/bin/env node
'use strict';

const { createServer } = require('../server/index');

const args = process.argv.slice(2);
let port = 4000;
let isDebug = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
        port = parseInt(args[++i], 10);
    } else if (args[i] === '--debug') {
        isDebug = true;
    }
}

createServer(port, isDebug);
