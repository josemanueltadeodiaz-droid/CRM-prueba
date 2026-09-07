# Componente UiInputComponent

El **UiInputComponent** es un componente de formulario altamente configurable y reutilizable que centraliza múltiples tipos de campos (inputs, selects, checkboxes, radios, toggles, textarea y campos especiales). Soporta validaciones, modo edición, modo visualización e integración con formularios de Angular, incluyendo variantes de filtros y selección avanzada.

## ¿Para qué sirve?

Este componente se utiliza para:

- Unificar todos los tipos de campos de formulario en un solo componente
- Simplificar la implementación de formularios complejos
- Garantizar consistencia visual y de comportamiento en todos los campos
- Facilitar la validación de datos
- Soportar modos de edición y visualización
- Implementar filtros avanzados y selección múltiple

## Características

- 18 variantes diferentes de campos
- Soporte para formularios reactivos y template-driven
- Validación integrada con estados visuales
- Modo de solo lectura/visualización
- Íconos dinámicos según el tipo de campo
- Estados visuales: focus, error, disabled
- Dropdowns y layouts complejos
- Diseño consistente y accesible

## Selector

```html
<app-ui-input-field></app-ui-input-field>

 ## Ejemplos de uso
Input básico
<app-ui-input-field
  label="Nombre"
  placeholder="Ingresa tu nombre"
  [(ngModel)]="nombre">
</app-ui-input-field>

Select con opciones
<app-ui-input-field
  label="Rol"
  variant="select"
  [options]="roles"
  (selectionChange)="onRolChange($event)">
</app-ui-input-field>

Checkbox
<app-ui-input-field
  label="Aceptar términos"
  variant="checkbox"
  [(ngModel)]="acepta">
</app-ui-input-field>

Toggle
<app-ui-input-field
  label="Activo"
  variant="toggle"
  [(ngModel)]="activo">
</app-ui-input-field>

## Comportamiento visual

Íconos dinámicos según variante

Estados: foco, error, disabled

Diseño consistente

Soporte para dropdowns y layouts complejos
