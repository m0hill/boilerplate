#!/bin/bash
set -euo pipefail

nub run typecheck
nub run lint
nub run format:check
nub run test
