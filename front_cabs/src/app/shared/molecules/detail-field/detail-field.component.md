# Componente DetailFieldComponent

El **DetailFieldComponent** es un componente reutilizable que muestra un campo de detalle compuesto por una etiqueta (label) y un valor. Su propósito es presentar información de forma clara y ordenada, ya sea en layout horizontal o vertical.

## ¿Para qué sirve?

Este componente se utiliza para:

- Mostrar pares label–valor
- Presentar detalles de un registro
- Construir vistas de detalle o resúmenes
- Mostrar información estática de forma consistente

## Instalación

Importa el componente donde se utilizará:

```typescript
import { DetailFieldComponent } from './ruta/detail-field/detail-field.component';

@Component({
  selector: 'app-detalle',
  standalone: true,
  imports: [DetailFieldComponent],
})
export class DetalleComponent {}

Uso básico (horizontal)
<app-detail-field label="Correo electrónico">
  usuario@email.com
</app-detail-field>

Uso en layout vertical
<app-detail-field
  label="Dirección"
  layout="vertical">
  Av. Principal #123, Durango
</app-detail-field>

