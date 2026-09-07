# Flujo de Vehículos en el Backend

Este documento detalla el funcionamiento del módulo de Vehículos en el backend, incluyendo la estructura de datos y los flujos de "Salida" y "Entrada".

## 1. Descripción General

El módulo de vehículos gestiona el inventario de la flota, su disponibilidad y el historial de uso. El núcleo de la lógica se encuentra en `VehiculosService`, que coordina las operaciones entre el controlador (`VehiculosController`) y los repositorios (`VehiculoRepository`, `UsoVehiculoRepository`).

La consistencia de los datos se garantiza mediante **transacciones de base de datos** (en `VehiculoRepository`), asegurando que el estado del vehículo (Disponible/Ocupado) siempre coincida con su registro de uso activo.

---

## 2. Estructura de Datos

### Modelo: Vehiculo (`fleet_vehiculos`)

Representa la ficha técnica y estado actual de cada unidad.

- **Id**: Identificador único.
- **Placas**: Identificador fiscal/legal (Único).
- **Disponible**: `bool`. Indica si el vehículo puede ser asignado. (`true` = Libre, `false` = En uso).
- **Kilometraje**: `int`. Kilometraje total acumulado actual.
- **HistorialCambios**: `json`. Auditoría de cambios en propiedades críticas (como kilometraje manual u observaciones).
- **Activo**: `bool`. Soft delete para sacar vehículos de operación sin perder historial.
- **Otros datos**: Marca, Modelo (TipoVehiculo), Transmisión, etc.

### Modelo: UsoVehiculo (`fleet_uso_vehiculos`)

Registra cada evento de préstamo o uso de un vehículo.

- **Id**: Identificador del viaje.
- **VehiculoId**: Referencia al vehículo usado.
- **UsuarioId**: Referencia al conductor/responsable.
- **Estado**: `EN_USO` | `COMPLETADO`.
- **FechaInicio / HoraSalida**: Cuándo salió el vehículo.
- **FechaFin / HoraRegreso**: Cuándo regresó (Nulo si está en uso).
- **KilometrajeInicial**: Lectura del odómetro al salir.
- **KilometrajeFinal**: Lectura del odómetro al regresar (Nulo si está en uso).
- **MotivoUso**: Razón del viaje.

---

## 3. Registro de Salida de Vehículo

El proceso se inicia en el endpoint `POST /api/vehiculos/{id}/salida`.

### Flujo Lógico (`RegistrarSalidaAsync`)

1.  **Validación de Datos**:
    - Se verifica que el usuario solicitante exista.
    - Se toma la fecha y hora actual (o la proporcionada).
2.  **Preparación del Registro**:
    - Se crea una instancia de `UsoVehiculo` con estado `EN_USO`, `KilometrajeInicial` y `UsuarioId`.
3.  **Transacción Atómica (BD)** (`RegistrarInicioUsoCompletoAsync`):
    - Se abre una transacción de base de datos.
    - **Verificación de Disponibilidad**: Se consulta el vehículo con bloqueo optimista/pesimista para asegurar que `Disponible == true`. Si no, se lanza error.
    - **Inserción**: Se guarda el nuevo registro en `fleet_uso_vehiculos`.
    - **Actualización de Vehículo**: Se marca `Vehiculo.Disponible = false`.
    - **Actualización de Kilometraje**: Si el kilometraje inicial reportado es mayor al actual del vehículo, se actualiza el vehículo.
    - **Commit**: Si todo es correcto, se confirman los cambios.
4.  **Caché**:
    - Se invalida el caché de vehículos para reflejar el cambio de estado inmediatamente.

---

## 4. Registro de Entrada de Vehículo

El proceso se inicia en el endpoint `POST /api/vehiculos/{id}/entrada`.

### Flujo Lógico (`RegistrarEntradaAsync`)

1.  **Búsqueda del Uso Activo**:
    - Se busca en `fleet_uso_vehiculos` un registro para ese vehículo con estado `EN_USO`.
    - _Auto-Healing_: Si el vehículo está marcado como "No Disponible" pero no hay registro de uso (inconsistencia), el sistema permite forzar la liberación creando un registro de uso "fantasma" para cerrar el ciclo correctamente.
2.  **Validaciones de Kilometrajes**:
    - `KilometrajeFinal` (entrada) **debe ser mayor o igual** a `KilometrajeInicial` (salida).
    - `KilometrajeFinal` **debe ser mayor o igual** al `Kilometraje` actual del vehículo.
3.  **Transacción Atómica (BD)** (`FinalizarUsoCompletoAsync`):
    - Se abre una transacción.
    - **Cierre de Uso**: Se actualiza el registro de `UsoVehiculo` con:
      - `FechaFin` y `HoraRegreso`.
      - `KilometrajeFinal`.
      - `Estado = "COMPLETADO"`.
      - `Observaciones`.
    - **Liberación de Vehículo**: Se marca `Vehiculo.Disponible = true`.
    - **Actualización de Odómetro**: Se actualiza `Vehiculo.Kilometraje` con el nuevo valor final.
    - **Commit**: Se confirman los cambios.
4.  **Caché**:
    - Se invalida el caché para mostrar el vehículo nuevamente como disponible.

---

## Resumen Técnico

| Acción      | Estado Vehículo         | Registro UsoVehiculo        | Trigger                 |
| :---------- | :---------------------- | :-------------------------- | :---------------------- |
| **Salida**  | `Disponible` -> `false` | Se crea (`EN_USO`)          | `RegistrarSalidaAsync`  |
| **Entrada** | `Disponible` -> `true`  | Se actualiza (`COMPLETADO`) | `RegistrarEntradaAsync` |

> **Nota**: El sistema utiliza **Redis** para cachear la lista de vehículos y el historial, mejorando el rendimiento de lectura. Cualquier operación de escritura (Salida/Entrada) invalida automáticamente este caché.
