# Componente Header

El **UiHeaderComponent** es un componente reutilizable que representa un **encabezado de sección o página**.  
Su propósito es mostrar un **título principal**, una **descripción opcional** y un **botón de acción**, manteniendo una estructura visual limpia y consistente.

---

## ¿Para qué sirve?

Este componente se utiliza para:

- Encabezar páginas o secciones
- Mostrar títulos principales
- Mostrar una breve descripción del contenido
- Ejecutar una acción principal mediante un botón

Es ideal para **pantallas principales, dashboards, listados y vistas de detalle**.

---

## Características principales

- 🧩 Componente standalone
- 🏷️ Título configurable
- 📝 Descripción opcional
- 🔘 Botón de acción configurable
- 👁️ Control de visibilidad de descripción y botón
- 🖱️ Emisión de evento al hacer clic en el botón

---

## Instalación

Importa el componente donde se utilizará el header:

```ts
import { UiHeaderComponent } from './ruta/ui-header/ui-header.component';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  imports: [UiHeaderComponent],
})
export class EjemploComponent {}

## Uso basico 
<app-ui-header
  titulo="Usuarios"
  descripcion="Listado general de usuarios registrados"
  buttonLabel="Agregar usuario"
  (buttonClick)="onAgregarUsuario()">
</app-ui-header>

Uso sin descripcion 

<app-ui-header
  titulo="Dashboard"
  [visualizarDescripcion]="false">
</app-ui-header>
 
 Uso sin boton 
 
 <app-ui-header
  titulo="Perfil"
  descripcion="Información del usuario"
  [visualizarButton]="false">
</app-ui-header>
