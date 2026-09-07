# Documentación de Atoms

> Los átomos son componentes reutilizables y fundamentales para la construcción de la UI en el front. Cada uno tiene funcionalidades independientes y puede ser usado en cualquier parte del proyecto.

> Dentro de cada carpeta hay un archivo `.md` con instrucciones específicas de uso.

---

## Índice de Átomos

- [Avatar](#avatar)
- [Badge](#badge)
- [Botón](#botón)
- [Icono](#icono)
- [Línea (Divider)](#línea-divider)
- [Loading Spinner](#loading-spinner)
- [Status Dot](#status-dot)
- [Tabla Base](#tabla-base)
- [Tipografía](#tipografía)

---

## Ejemplo de Importación General

```typescript
import { NombreDelAtomComponent } from 'ruta/al/atom/nombre-atom.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [NombreDelAtomComponent],
    // ...
})
```

---

## Avatar

Componente reutilizable para mostrar las iniciales del usuario en un círculo.

**Instalación:**
```typescript
import { UiAvatarComponent } from './ruta/atomic/avatar/avatar.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [UiAvatarComponent],
})
```

**Uso:**
```html
<app-ui-avatar></app-ui-avatar>
```

---

## Badge

Componente para mostrar etiquetas de estado con colores e íconos según el tipo.

**Instalación:**
```typescript
import { BadgeComponent } from './ruta/atomic/bage/badge.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [BadgeComponent],
})
```

**Inputs:**
| Propiedad | Tipo | Valores | Por defecto | Descripción |
|-----------|------|---------|-------------|-------------|
| tipo | string | 'success', 'default', 'info', 'warning', 'error' | 'default' | Tipo de badge (color e ícono) |
| Texto | string | Cualquier texto | 'Texto' | Texto a mostrar |

**Uso:**
```html
<app-badge tipo="success" Texto="¡Éxito!"></app-badge>
```

---

## Botón

Botón reutilizable con variantes, iconos y estados de carga.

**Instalación:**
```typescript
import { UiBotonComponent } from './ruta/atomic/boton/boton.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [UiBotonComponent],
})
```

**Inputs principales:**
| Propiedad           | Tipo      | Valores                                        |  Por Defecto | Descripción                                          |
|---------------------|-----------|------------------------------------------------|--------------|------------------------------------------------------|
| variante            | string    | 'primario', 'secundario', 'terciario'          | 'primario'   | Estilo visual del botón                              |
| texto               | string    | Cualquier texto                                | 'Botón'      | Texto del botón                                      |
| tipo                | string    | 'button', 'submit', 'reset'                    | 'button'     | Tipo HTML                                            |
| estaCargando        | boolean   | true, false                                    | false        | Muestra spinner y deshabilita el botón               |
| estaDeshabilitado   | boolean   | true, false                                    | false        | Deshabilita el botón                                 |
| anchoCompleto       | boolean   | true, false                                    | true         | Ocupa el 100% del ancho                              |
| mostrarIcono        | boolean   | true, false                                    | false        | Muestra un icono                                     |
| iconoPersonalizado  | string    | SVG como string                                | undefined    | SVG personalizado                                    |

**Uso:**
```html
<app-ui-boton texto="Guardar" variante="primario"></app-ui-boton>
```

---

## Icono

Componente para mostrar iconos de Heroicons con tamaño y color personalizables.

**Instalación:**
```typescript
import { UiIconComponent } from './ruta/atomic/icono/icono.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [UiIconComponent],
})
```

**Inputs:**
| Propiedad | Tipo | Valores | Por defecto | Descripción |
|----------|------|---------|-------------|-------------|
| name     | string | Nombre del icono | 'check' | Nombre del icono Heroicons |
| size     | string | Clases Tailwind  | 'h-6 w-6' | Tamaño del icono |
| color    | string | Clases Tailwind  | 'text-gray-700' | Color del icono |

**Uso:**
```html
<app-ui-icono name="check" size="h-6 w-6" color="text-green-600"></app-ui-icono>
```

---

## Línea (Divider)

Componente para separar visualmente secciones, horizontal o vertical.

**Instalación:**
```typescript
import { UiDividerComponent } from './ruta/atomic/linea/linea.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [UiDividerComponent],
})
```

**Uso:**
```html
<!-- Horizontal (por defecto) -->
<app-ui-divider></app-ui-divider>

<!-- Vertical -->
<app-ui-divider [horizontal]="false"></app-ui-divider>
```

---

## Loading Spinner

Componente para mostrar un spinner de carga con mensaje opcional.

**Instalación:**
```typescript
import { LoadingSpinnerComponent } from './ruta/atomic/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [LoadingSpinnerComponent],
})
```

**Inputs:**
| Propiedad | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| mensaje   | string | 'Cargando...' | Mensaje a mostrar debajo del spinner |

**Uso:**
```html
<app-loading-spinner mensaje="Cargando datos..."></app-loading-spinner>
```

---

## Status Dot

Componente para mostrar etiquetas de estado con íconos, colores automáticos y soporte para SVG personalizados.

**Instalación:**
```typescript
import { StatusDotComponent } from './ruta/shared/components/atoms/status-dot/status-dot.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [StatusDotComponent],
})
```

**Inputs:**
| Propiedad | Tipo | Valores | Por defecto | Descripción |
|----------|------|---------|-------------|-------------|
| texto    | string | Cualquier texto | '' | Texto visible junto al icono |
| tipo     | StatusType | 'completado', 'atencion', 'nuevo', 'revision', 'rechazado', 'enviada', 'aprobado', 'venta-realizada', 'personalizado', 'neutral' | 'personalizado' | Tipo de estado (color + icono) |
| mostrarIcono | boolean | true, false | true | Muestra el icono |
| colorTexto | string | (solo personalizado) | undefined | Color del texto |
| colorFondo | string | (solo personalizado) | undefined | Color de fondo |
| svgPersonalizado | string | SVG como string | undefined | SVG personalizado |

**Uso:**
```html
<app-status-dot texto="Aprobado" tipo="aprobado"></app-status-dot>
```

---

## Tabla Base

Componentes para celdas y encabezados de tablas reutilizables.

**Instalación:**
```typescript
import { TableCellComponent } from './ruta/atomic/tabla-base/table-cell/table-cell.component';
import { TableHeaderCellComponent } from './ruta/atomic/tabla-base/table-header-cell/table-header-cell.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [TableCellComponent, TableHeaderCellComponent],
})
```

**Uso:**
```html
<app-table-header-cell encabezado="Nombre" ancho="150px"></app-table-header-cell>
<app-table-cell [valor]="dato.nombre"></app-table-cell>
```

---

## Tipografía

Componente para aplicar estilos de texto reutilizables según jerarquía y tamaño.

**Instalación:**
```typescript
import { UitipografiaComponent } from './ruta/atomic/tipografia/tipografia.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    imports: [UitipografiaComponent],
})
```

**Inputs:**
| Propiedad | Tipo | Valores | Por defecto | Descripción |
|-----------|------|---------|-------------|-------------|
| variante  | string | 'h1'...'h6', 'p', 'p-lg', 'p-md', 'p-sm', 'caption', 'caption-lg', 'caption-md', 'caption-sm' | 'p' | Estilo de jerarquía del texto |
| texto     | string/number | Cualquier texto | '' | Texto a mostrar |
| color     | string | Clases Tailwind | undefined | Color del texto (opcional) |

**Uso:**
```html
<app-ui-tipografia variante="h2" texto="Título de sección" color="text-gray-800"></app-ui-tipografia>
```