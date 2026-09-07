# Componente DetailSectionComponent

El **DetailSectionComponent** es un componente reutilizable diseñado para agrupar y presentar información relacionada dentro de una sección visualmente delimitada. Su propósito es organizar contenidos de detalle bajo un título claro, con la opción de acompañarlo de un icono representativo, mejorando la legibilidad y la experiencia del usuario.

## ¿Para qué sirve?

Este componente se utiliza para:

- Agrupar campos de información relacionados
- Estructurar vistas de detalle de forma clara
- Mejorar la jerarquía visual del contenido
- Acompañar secciones con iconografía descriptiva

## Instalación

Importa el componente en el contenedor donde se utilizará:

```typescript
import { DetailSectionComponent } from './ruta/detail-section/detail-section.component';

@Component({
  selector: 'app-detalle-usuario',
  standalone: true,
  imports: [DetailSectionComponent],
})
export class DetalleUsuarioComponent {}
