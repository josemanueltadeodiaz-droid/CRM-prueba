# Componente Header del Modal (app-header-modal)

El **Header Modal Component** es un componente reutilizable que muestra el encabezado informativo de una ventana modal. Proporciona al usuario un título claro, una descripción contextual y un botón de cierre, mejorando la comprensión del contenido y la experiencia de usuario.

## ¿Para qué sirve?

Este componente se utiliza para:

- Mostrar el encabezado informativo de ventanas modales
- Proporcionar contexto sobre el contenido del modal
- Permitir el cierre explícito del modal desde el encabezado
- Mantener coherencia visual en los encabezados de modales de la aplicación

## Características

- Título principal claro y descriptivo
- Texto de descripción contextual opcional
- Botón de cierre con icono
- Diseño responsivo con flexbox
- Borde inferior para separación visual
- Comunicación con componente padre mediante eventos
- Componente reutilizable en diferentes modales

## Instalación

Importa el componente en el módulo o componente donde se utilizará:

```typescript
import { HeaderModalComponent } from './ruta/header-modal/header-modal.component';

@Component({
  selector: 'app-mi-modal',
  standalone: true,
  imports: [HeaderModalComponent],
})
export class MiModalComponent {}
