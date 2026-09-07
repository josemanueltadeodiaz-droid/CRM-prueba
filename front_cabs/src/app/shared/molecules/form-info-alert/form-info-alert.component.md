# Componente FormInfoAlertComponent

El **FormInfoAlertComponent** es un componente reutilizable que muestra mensajes informativos con diferentes estados visuales. Su propósito es proporcionar feedback contextual en formularios y secciones de información, utilizando colores e iconos diferenciados para transmitir claramente el tipo de mensaje.

## ¿Para qué sirve?

Este componente se utiliza para:

- Mostrar mensajes informativos en formularios
- Proporcionar feedback sobre el estado de una operación
- Alertar al usuario sobre advertencias o errores
- Confirmar acciones exitosas
- Mejorar la experiencia de usuario con indicadores visuales claros

## Características

- Componente standalone
- Cuatro tipos de alerta visualmente diferenciados
- Icono opcional para cada tipo de mensaje
- Mensaje completamente personalizable
- Integración sencilla con formularios

## Tipos de alerta disponibles

| Tipo | Uso recomendado |
|------|-----------------|
| info | Información general o notas |
| warning | Advertencias y precauciones |
| success | Confirmación de operaciones exitosas |
| error | Mensajes de error y problemas críticos |

## Instalación

Importa el componente en el módulo o componente donde se utilizará:

```typescript
import { FormInfoAlertComponent } from './ruta/form-info-alert/form-info-alert.component';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [FormInfoAlertComponent],
})
export class FormularioComponent {}
