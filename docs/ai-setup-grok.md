# Setup de IA — Grok en YerbaXanaes

## Qué se hizo

| Antes | Después |
|-------|---------|
| `AGENTS.md` + `CLAUDE.md` (~22 KB, solapados y desfasados) | Solo `AGENTS.md` lean (~4 KB) |
| Home Claude PE-bridge / ops / review en cada turno | **Desactivado** vía `.envrc` (`GROK_CLAUDE_AGENTS_ENABLED=false`, etc.) |
| MCP context7 (timeout) + atlassian (sin auth) desde `~/.claude.json` | **Desactivados** en este repo; CodeGraph nativo en `.grok/config.toml` |
| Sin checklist de go-live en repo | `docs/go-live.md` |
| Carpeta no trusted | Trusted en `~/.grok/trusted_folders.toml` |

## Archivos

```
AGENTS.md                 # Instrucciones del monorepo (única fuente)
.envrc                    # Env de aislamiento Claude/Cursor para Grok
.grok/config.toml         # MCP codegraph + permisos del proyecto
.grok/rules/00-performance.md
.grok/rules/01-domain.md
docs/go-live.md           # Checklist P0/P1/P2 producción
docs/ai-setup-grok.md     # Este archivo
scripts/grok-here.sh      # Launcher sin direnv
```

## Cómo arrancar (nueva sesión)

```bash
cd /ruta/a/YerbaXanaesMain
direnv allow          # primera vez
grok
# alternativo:
./scripts/grok-here.sh
```

**Importante:** la sesión de Grok ya abierta **no** relee `.envrc` al completo. Abrí una sesión nueva para ver el aislamiento.

Verificación:

```bash
grok inspect
# Project Instructions: Claude home debe figurar [disabled]
# MCP: codegraph (project); context7/atlassian [disabled]
```

## Qué NO se tocó (a propósito)

- `~/.claude/` global — sigue para otros proyectos con Claude Code
- Skills del marketplace/plugins globales (se listan, se activan solo si hacen falta)
- `.agents/skills/` del repo (MercadoPago, Nest, Better Auth) — siguen disponibles
- Código de la aplicación (ecommerce/api/backoffice)

## Backup local

Si hace falta recuperar el `CLAUDE.md` viejo:

`/tmp/yerba-ai-setup-backup/CLAUDE.md.bak` (solo en esta máquina, no en git)

## Mejora opcional de I/O

El checkout en `/mnt/c/...` es lento (WSL 9p). Para máximo rendimiento:

```bash
# ejemplo: clonar o worktree en FS Linux nativo
git clone <url> ~/projects/YerbaXanaesMain
cd ~/projects/YerbaXanaesMain && direnv allow && grok
```

CodeGraph en `/mnt/c` no auto-watchea: después de muchos cambios, `codegraph sync`.
