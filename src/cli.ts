#!/usr/bin/env node

import { runWithCliErrorBoundary } from './errors/index.js';
import { runCli } from './main.js';

process.exitCode = await runWithCliErrorBoundary(() => runCli());
