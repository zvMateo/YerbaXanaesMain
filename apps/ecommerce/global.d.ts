// Permite importar archivos CSS como side-effect (ej: import "./globals.css")
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
