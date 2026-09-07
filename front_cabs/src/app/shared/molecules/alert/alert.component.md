# Componente Alert

El `UiAlertComponent` es un componente reutilizable que representa una alerta visual dentro de la aplicación. Su propósito es mostrar mensajes de información, éxito, advertencia o error, de forma clara y consistente, con soporte para iconos, cierre manual y cierre automático.

## ¿Para qué sirve?

Este componente se utiliza para:

- Mostrar mensajes informativos al usuario
- Indicar errores o advertencias del sistema
- Confirmar acciones exitosas
- Mostrar alertas temporales o persistentes
- Mantener una experiencia visual uniforme en el sistema

Es ideal para notificaciones, validaciones y feedback visual dentro de aplicaciones Angular.

## Características

- Componente standalone
- Soporte para distintos tipos de alerta (info, success, warning, error)
- Icono configurable según el tipo de alerta
- Opción de cerrar la alerta manualmente
- Cierre automático configurable
- Control de visibilidad
- Soporte para contenido proyectado (ng-content)
- Accesibilidad con `role="alert"` y `aria-label`

### Tipos de alerta disponibles

| Tipo     | Uso recomendado           |
|----------|---------------------------|
| info     | Información general       |
| success  | Confirmación de acciones  |
| warning  | Advertencias importantes  |
| error    | Errores o fallos críticos |

## Instalación

Importa el componente en el componente donde se utilizará la alerta:

```typescript
import { UiAlertComponent } from './ruta/ui-alert/ui-alert.component';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  imports: [UiAlertComponent],
})
export class EjemploComponent {}

Uso básico
<app-alert
  tipo="success"
  titulo="Operación exitosa"
  descripcion="Los datos se guardaron correctamente">
</app-alert>

Uso con botón de cierre
<app-alert
  tipo="warning"
  titulo="Atención"
  descripcion="Esta acción no se puede deshacer"
  [cerrable]="true"
  (onClose)="onCerrarAlerta()">
</app-alert>

Uso con cierre automático
<app-alert
  tipo="info"
  titulo="Mensaje informativo"
  descripcion="Esta alerta se cerrará automáticamente"
  [autoCerrar]="3000">
</app-alert>

Uso con contenido personalizado

Si no se define titulo ni descripcion, se puede proyectar contenido:

<app-alert tipo="error">
  <strong>Error crítico:</strong> No se pudo conectar con el servidor.
</app-alert>

