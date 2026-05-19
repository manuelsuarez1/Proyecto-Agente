# Gestión de Dependencias

## Políticas de Gestión de Dependencias

Este documento describe las políticas y procedimientos para la gestión de dependencias del proyecto.

## Categorización de Dependencias

### Dependencias Críticas
- `electron` y sus componentes principales
- `react` y `react-dom` para la interfaz de usuario
- `vite` para el empaquetado y desarrollo

### Dependencias de Interfaz de Usuario
- `lucide-react` para iconos
- `react-markdown` para renderizado de markdown
- `react-syntax-highlighter` para resaltado de sintaxis

### Dependencias de Utilidades
- `axios` para peticiones HTTP
- `cheerio` para parseo de HTML
- `uuid` para generación de identificadores únicos

## Procedimiento de Actualización

### Revisión de Seguridad
1. Ejecutar regularmente `npm audit` para identificar vulnerabilidades
2. Aplicar actualizaciones de seguridad de manera inmediata
3. Verificar que las actualizaciones no rompan funcionalidades existentes

### Actualizaciones Automáticas
- Las actualizaciones menores y parches se aplican automáticamente
- Las actualizaciones mayores requieren revisión manual

## Scripts de Gestión

```json
{
  "scripts": {
    "deps:audit": "npm audit",
    "deps:outdated": "npm outdated",
    "deps:update": "npm update",
    "deps:check": "npm audit && npm outdated"
  }
}
```

## Proceso de Revisión

1. Ejecutar `npm run deps:check` semanalmente
2. Revisar el archivo `renovate.json` para configuración de actualizaciones automáticas
. Ejecutar `npm run deps:update` para aplicar actualizaciones seguras
