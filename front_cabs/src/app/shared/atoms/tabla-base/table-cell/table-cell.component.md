
# Componente Table Cell

El **TableCellComponent** es un componente reutilizable diseñado para representar una **celda de una tabla**.  
Permite mostrar un valor simple o renderizar contenido personalizado mediante un `TemplateRef`, lo que lo hace ideal para tablas dinámicas y reutilizables.

## ¿Para qué sirve?

- Mostrar datos dentro de una celda de tabla
- Personalizar el contenido de una celda (botones, estados, íconos, etc.)
- Controlar la alineación del contenido
- Reutilizar la lógica de renderizado en tablas complejas

---

# Propiedades 
| Propiedad  | Tipo                          | Valor por defecto | Descripción                 |            |                          |
| ---------- | ----------------------------- | ----------------- | --------------------------- | ---------- | ------------------------ |
| valor      | `any`                         | —                 | Valor a mostrar en la celda |            |                          |
| dato       | `any`                         | —                 | Objeto completo de la fila  |            |                          |
| plantilla  | `TemplateRef<any>` (opcional) | —                 | Template personalizado      |            |                          |
| alineacion | `'left'                       | 'center'          | 'right'`                    | `'center'` | Alineación del contenido |


## Características

- 📦 Soporta valor simple o template personalizado
- 🧩 Componente standalone
- 🎯 Alineación configurable
- ♻️ Reutilizable en tablas dinámicas


## Instalación

```ts
import { TableCellComponent } from './ruta/table-cell/table-cell.component';

@Component({
  selector: 'app-mi-tabla',
  standalone: true,
  imports: [TableCellComponent],
})
export class MiTablaComponent {}



