#!/usr/bin/env bash
# Lanza Grok con el entorno óptimo de YerbaXanaes (sin depender de direnv).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export GROK_CLAUDE_AGENTS_ENABLED=false
export GROK_CLAUDE_RULES_ENABLED=false
export GROK_CLAUDE_MCPS_ENABLED=false
export GROK_CLAUDE_HOOKS_ENABLED=false
export GROK_CLAUDE_SESSIONS_ENABLED=false
export GROK_CURSOR_AGENTS_ENABLED=false
export GROK_CURSOR_RULES_ENABLED=false
export GROK_CURSOR_MCPS_ENABLED=false
export GROK_CURSOR_HOOKS_ENABLED=false
export GROK_CURSOR_SESSIONS_ENABLED=false
export GROK_CLAUDE_SKILLS_ENABLED=true
export GROK_CURSOR_SKILLS_ENABLED=false

exec grok "$@"
