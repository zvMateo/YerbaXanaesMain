# Dominio YerbaXanaes

- Emprendimiento de **yerba mate** (Villa del Rosario, Córdoba). E-commerce + backoffice.
- Pagos: **Payment Brick** + webhook firmado. Backend = fuente de verdad de monto, stock y estado.
- Stock: receta (`VariantIngredient` → `InventoryItem`) o stock directo en variante; siempre con locks en checkout.
- Canales de venta: ONLINE, STORE, INSTAGRAM, WHATSAPP, FAIR.
- **Contenido real:** no inventar testimonios, teléfonos, direcciones, stats (“500+ clientes”) ni formularios que fingen envío.
- Go-live: leer y respetar `docs/go-live.md` antes de cambios de marca o producción.
