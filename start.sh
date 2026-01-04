#!/usr/bin/env bash
set -euo pipefail

# Launch the Node backend
cd "$(dirname "$0")/backend"
npm install
