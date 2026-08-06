# Rendimiento en YerbaXanaes

- **CodeGraph primero** (`.codegraph/` existe): `codegraph_explore` / `codegraph_node` antes de `find` o leer docenas de archivos.
- Este checkout suele vivir en **WSL `/mnt/c` (9p)**: I/O lento. No hagas `find` del monorepo ni `rg` sin `path` acotado.
- Tras editar muchos archivos: `codegraph sync` (watcher deshabilitado en 9p).
- Preferí editar con paths relativos y tests de un solo archivo (`bun run test -- --testPathPattern=...`).
- Subagentes: usá `explore` para mapear; implementá en el agente principal salvo tareas paralelas independientes.
