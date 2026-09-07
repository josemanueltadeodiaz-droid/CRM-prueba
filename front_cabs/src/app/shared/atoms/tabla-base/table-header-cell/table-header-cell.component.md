# Componente Table Header Cell

El **TableHeaderCellComponent** es un componente reutilizable que representa una **celda de encabezado (`th`)** dentro de una tabla.  
Su propósito es mostrar los títulos de las columnas de forma consistente, permitiendo controlar el **texto**, **ancho** y **alineación** de cada encabezado.

---

## ¿Para qué sirve?

Este componente se utiliza para:

- Mostrar encabezados de columnas en tablas
- Definir el ancho de una columna
- Controlar la alineación del texto
- Mantener estilos uniformes en los encabezados

Es ideal para tablas reutilizables o sistemas de diseño.

---

## Características

- 🧩 Componente standalone
- 🏷️ Texto de encabezado configurable
- 📐 Ancho opcional por columna
- 🎯 Alineación personalizable
- 🎨 Estilos consistentes integrados

---

## Instalación

Importa el componente en el componente donde se utilizará la tabla:

```ts
import { TableHeaderCellComponent } from './ruta/table-header-cell/table-header-cell.component';

@Component({
  selector: 'app-mi-tabla',
  standalone: true,
  imports: [TableHeaderCellComponent],
})
export class MiTablaComponent {}
