using back_cabs.CRM.contexts;
using back_cabs.CRM.Interfaces.Shared;
using back_cabs.CRM.Interfaces.Auth;
using CRM.DTOs.Request;
using CRM.DTOs.Response;
using back_cabs.CRM.models.Shared;
using Microsoft.EntityFrameworkCore;
using back_cabs.CRM.services;
using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace back_cabs.CRM.services.Fleet;

/// <summary>
/// Clases auxiliares para deserializar el historial JSON de cambios
/// </summary>
public class HistorialCambioJson
{
    public DateTime fecha { get; set; }
    public int? usuario_id { get; set; }
    public CambiosJson cambios { get; set; } = new CambiosJson();
}

public class CambiosJson
{
    public CambioDetalleJson? kilometraje { get; set; }
    public CambioDetalleJson? observaciones { get; set; }
    public CambioDetalleJson? activo { get; set; }
}

public class CambioDetalleJson
{
    public string? anterior { get; set; }
    public string? nuevo { get; set; }
}

/// <summary>
/// Servicio que maneja la lógica de negocio para vehículos.
/// Usa Repository Pattern para acceso a datos con separación de responsabilidades.
/// ✅ REDIS: Implementa caché para mejorar rendimiento en consultas frecuentes
/// </summary>
public class VehiculosService
{
    // ✅ Inyección de dependencias: Repository Pattern para acceso a datos
    // desacoplado y testeable
    private readonly IVehiculoRepository _vehiculoRepository;
    private readonly IUsuarioAuthRepository _usuarioAuthRepository;
    private readonly IUsoVehiculoRepository _usoVehiculoRepository;
    private readonly ILogger<VehiculosService> _logger;
    private readonly ICacheService _cacheService; // ✅ REDIS: Servicio de caché
    private readonly WriteContext _writeContext; // ✅ Para transacciones
    private readonly ReadOnlyContext _readContext; // Para consultar auditoría
    private readonly IHttpContextAccessor _httpContextAccessor; // ✅ Para obtener usuario de sesión

    // ✅ REDIS: Constantes para claves de caché (consistencia y mantenibilidad)
    private const string CACHE_KEY_ALL_VEHICULOS = "vehiculos:active"; // Solo activos
    private const string CACHE_KEY_VEHICULO_PREFIX = "vehiculos:id:";
    private const string CACHE_KEY_HISTORIAL_PREFIX = "vehiculos:historial:";
    private const string CACHE_KEY_USO_PREFIX = "vehiculos:uso:";
    private const int CACHE_EXPIRATION_MINUTES = 30; // Catálogos estables

    public VehiculosService(
        IVehiculoRepository vehiculoRepository,
        IUsuarioAuthRepository usuarioAuthRepository,
        IUsoVehiculoRepository usoVehiculoRepository,
        ILogger<VehiculosService> logger,
        ICacheService cacheService,
        ReadOnlyContext readContext,
        WriteContext writeContext,
        IHttpContextAccessor httpContextAccessor)
    {
        _vehiculoRepository = vehiculoRepository;
        _usuarioAuthRepository = usuarioAuthRepository;
        _usoVehiculoRepository = usoVehiculoRepository;
        _logger = logger;
        _cacheService = cacheService;
        _readContext = readContext;
        _writeContext = writeContext;
        _httpContextAccessor = httpContextAccessor;
    }

    // ... (Existing methods) ...

    /// <summary>
    /// Registra la salida de un vehículo.
    /// ✅ TRANSACCIONAL: Usa RegistrarInicioUsoCompletoAsync para garantizar atomicidad
    /// ✅ AUTO-SESIÓN: Obtiene UsuarioId de la sesión si no se proporciona
    /// - Verifica disponibilidad
    /// - Crea registro en historial de uso
    /// - Marca vehículo como no disponible
    /// ✅ GARANTÍA: Si algo falla, se hace ROLLBACK de TODO (sin orphans)
    /// </summary>
    public async Task<VehiculoResponseDto> RegistrarSalidaAsync(int vehiculoId, RegistrarSalidaDto request)
    {
        try
        {
            // ✅ Obtener ID del usuario de la sesión si no se proporciona
            int usuarioId = request.UsuarioId ?? GetCurrentUserId();
            
            _logger.LogInformation(
                "Registrando salida de vehículo {VehiculoId} para usuario {UsuarioId}. Motivo: {Motivo}",
                vehiculoId, usuarioId, request.MotivoUso);

            // Validar que el usuario existe
            var usuario = await _usuarioAuthRepository.GetByIdAsync(usuarioId);
            if (usuario == null)
            {
                throw new KeyNotFoundException($"Usuario con ID {usuarioId} no encontrado.");
            }

            var fechaInicio = request.FechaSalida ?? DateTime.UtcNow;

            var uso = new UsoVehiculo
            {
                UsuarioId = usuarioId,
                FechaInicio = fechaInicio,
                Fecha = fechaInicio.Date,
                HoraSalida = fechaInicio.TimeOfDay,
                MotivoUso = request.MotivoUso,
                KilometrajeInicial = request.KilometrajeInicial,
                Estado = "EN_USO"
            };

            // ✅ TRANSACCIONAL: Esto garantiza que NO habrá registros huérfanos
            var vehiculo = await _vehiculoRepository.RegistrarInicioUsoCompletoAsync(
                vehiculoId, 
                uso, 
                request.KilometrajeInicial);

            // ✅ Invalidar caché después de transacción exitosa
            await InvalidarCacheVehiculo(vehiculoId);

            _logger.LogInformation(
                "Salida registrada exitosamente para vehículo {Placas}. Disponible: {Disponible}",
                vehiculo.Placas, vehiculo.Disponible);

            return MapToResponseDto(vehiculo);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Recurso no encontrado al registrar salida: {VehiculoId}", vehiculoId);
            throw;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error de negocio al registrar salida: {VehiculoId}", vehiculoId);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar salida del vehículo {VehiculoId}", vehiculoId);
            throw;
        }
    }

    /// <summary>
    /// Registra el regreso de un vehículo.
    /// ✅ TRANSACCIONAL: Usa FinalizarUsoCompletoAsync para garantizar atomicidad
    /// - Encuentra el uso activo
    /// - Calcula tiempos y actualiza registro
    /// - Marca vehículo como disponible
    /// - Actualiza kilometraje del vehículo
    /// ✅ GARANTÍA: Si algo falla, se hace ROLLBACK de TODO (sin orphans)
    /// </summary>
    public async Task<VehiculoResponseDto> RegistrarEntradaAsync(int vehiculoId, RegistrarEntradaDto request)
    {
        try
        {
            var vehiculo = await _vehiculoRepository.GetByIdAsync(vehiculoId);
            if (vehiculo == null) throw new KeyNotFoundException($"Vehículo {vehiculoId} no encontrado.");

            var uso = await _usoVehiculoRepository.GetUsoActivoPorVehiculoAsync(vehiculoId);
            
            // ✅ AUTO-HEALING: Si no hay uso activo pero el vehículo estaba ocupado, permitimos corregirlo
            if (uso == null) 
            {
                _logger.LogWarning("Estado inconsistente detectado: El vehículo {Placas} (ID: {Id}) estaba marcado como 'En Uso' pero no tenía registro activo en UsoVehiculos. Se procederá a liberar el vehículo.", vehiculo.Placas, vehiculo.Id);

                // Validar contra el kilometraje actual del vehículo en lugar del uso
                if (request.KilometrajeFinal < vehiculo.Kilometraje)
                {
                     throw new InvalidOperationException($"El kilometraje final ({request.KilometrajeFinal}) no puede ser menor al actual del vehículo ({vehiculo.Kilometraje}).");
                }

                // Crear registro de uso vacío para solo liberar el vehículo
                uso = new UsoVehiculo
                {
                    VehiculoId = vehiculoId,
                    UsuarioId = 1,  // Usuario por defecto para auto-healing
                    FechaInicio = DateTime.UtcNow.AddMinutes(-30),
                    Fecha = DateTime.UtcNow.Date,
                    HoraSalida = DateTime.UtcNow.TimeOfDay,
                    MotivoUso = "Corrección de inconsistencia",
                    KilometrajeInicial = vehiculo.Kilometraje,
                    Estado = "EN_USO"
                };
            }

            // Validar kilometraje
            if (request.KilometrajeFinal < uso.KilometrajeInicial)
            {
                 throw new InvalidOperationException($"El kilometraje final ({request.KilometrajeFinal}) no puede ser menor al inicial ({uso.KilometrajeInicial}).");
            }

            var fechaFin = request.FechaRegreso ?? DateTime.UtcNow;

            // Actualizar registro de uso con datos de finalización
            uso.KilometrajeFinal = request.KilometrajeFinal;
            uso.FechaFin = fechaFin;
            uso.HoraRegreso = fechaFin.TimeOfDay;
            uso.Observaciones = request.Observaciones;
            uso.Estado = request.Estado ?? "COMPLETADO";

            // ✅ TRANSACCIONAL: Esto garantiza que NO habrá registros huérfanos
            var vehiculoActualizado = await _vehiculoRepository.FinalizarUsoCompletoAsync(
                vehiculoId,
                uso,
                request.KilometrajeFinal);

            // ✅ Invalidar caché después de transacción exitosa
            await InvalidarCacheVehiculo(vehiculoId);

            return MapToResponseDto(vehiculoActualizado);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar entrada del vehículo {VehiculoId}", vehiculoId);
            throw;
        }
    }

    public async Task<IEnumerable<UsoVehiculo>> ObtenerHistorialUsoAsync(int vehiculoId)
    {
        try
        {
            // ✅ Validar que el vehículo existe
            var vehiculo = await _vehiculoRepository.GetByIdAsync(vehiculoId);
            if (vehiculo == null)
            {
                _logger.LogWarning("Intento de obtener historial para vehículo no existente: {VehiculoId}", vehiculoId);
                throw new KeyNotFoundException($"Vehículo con ID {vehiculoId} no encontrado");
            }

            // ✅ REDIS: Cachear historial de uso
            string cacheKey = $"{CACHE_KEY_USO_PREFIX}{vehiculoId}";
            var cached = await _cacheService.GetAsync<IEnumerable<UsoVehiculo>>(cacheKey);
            if (cached != null)
            {
                _logger.LogDebug("Historial de uso obtenido desde caché para vehículo {VehiculoId}", vehiculoId);
                return cached;
            }

            // ✅ Cache miss: Consultar base de datos
            var historial = await _usoVehiculoRepository.GetHistorialPorVehiculoAsync(vehiculoId);
            
            // ✅ Guardar en caché
            await _cacheService.SetAsync(cacheKey, historial, TimeSpan.FromMinutes(CACHE_EXPIRATION_MINUTES));
            _logger.LogDebug("Historial de uso guardado en caché para vehículo {VehiculoId}", vehiculoId);
            
            return historial;
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Vehículo no encontrado al obtener historial: {VehiculoId}", vehiculoId);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener historial de uso del vehículo {VehiculoId}", vehiculoId);
            throw;
        }
    }


    /// <summary>
    /// Obtiene todos los vehículos ACTIVOS ordenados por placas.
    /// ✅ Usa Repository Pattern para acceso optimizado a datos
    /// ✅ El OrderBy usa el índice configurado en la base de datos para Placas
    /// ✅ REDIS: Implementa cache-aside pattern para reducir consultas a BD
    /// ✅ Solo devuelve vehículos activos para evitar mostrar inactivos en UI
    /// </summary>
    public async Task<IEnumerable<VehiculoResponseDto>> ObtenerTodosAsync()
    {
        // ✅ REDIS: Paso 1 - Intentar obtener del caché (Cache-Aside Pattern)
        var cached = await _cacheService.GetAsync<IEnumerable<VehiculoResponseDto>>(CACHE_KEY_ALL_VEHICULOS);
        if (cached != null)
        {
            _logger.LogDebug("Vehículos obtenidos desde caché Redis");
            return cached;
        }

        // ✅ REDIS: Paso 2 - Cache miss: Consultar base de datos
        _logger.LogDebug("Caché miss: Consultando vehículos desde base de datos");
        var vehiculos = await _vehiculoRepository.GetAllAsync();
        
        var dtos = vehiculos.Select(v => new VehiculoResponseDto
        {
            Id = v.Id,
            Placas = v.Placas,
            TipoVehiculo = v.TipoVehiculo,
            EsDeEmpresa = v.EsDeEmpresa,
            Observaciones = v.Observaciones,
            Transmision = v.Transmision,
            Activo = v.Activo,
            Disponible = v.Disponible,  // ✅ AGREGAR: Incluir estado de disponibilidad
            NombreVehiculo = v.NombreVehiculo,
            Kilometraje = v.Kilometraje
        }).ToList();

        // ✅ REDIS: Paso 3 - Guardar en caché para futuras consultas
        await _cacheService.SetAsync(CACHE_KEY_ALL_VEHICULOS, dtos, TimeSpan.FromMinutes(CACHE_EXPIRATION_MINUTES));
        _logger.LogDebug("Vehículos guardados en caché Redis por {Minutes} minutos", CACHE_EXPIRATION_MINUTES);

        return dtos;
    }

    /// <summary>
    /// Obtiene un vehículo por ID.
    /// ✅ Usa Repository Pattern para consulta optimizada
    /// ✅ REDIS: Caché individual por ID para consultas frecuentes
    /// </summary>
    public async Task<VehiculoResponseDto?> ObtenerPorIdAsync(int id)
    {
        // ✅ REDIS: Intentar obtener del caché individual
        string cacheKey = $"{CACHE_KEY_VEHICULO_PREFIX}{id}";
        var cached = await _cacheService.GetAsync<VehiculoResponseDto>(cacheKey);
        if (cached != null)
        {
            _logger.LogDebug("Vehículo {Id} obtenido desde caché Redis", id);
            return cached;
        }

        // ✅ Repository Pattern: consulta optimizada sin tracking
        var vehiculo = await _vehiculoRepository.GetByIdAsync(id);
        if (vehiculo == null)
        {
            return null;
        }

        var dto = MapToResponseDto(vehiculo);

        // ✅ REDIS: Guardar en caché individual
        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(CACHE_EXPIRATION_MINUTES));
        _logger.LogDebug("Vehículo {Id} guardado en caché Redis", id);

        return dto;
    }

    /// <summary>
    /// Crea un nuevo vehículo.
    /// ✅ Usa Repository Pattern para validaciones y creación
    /// ✅ Aplica todas las validaciones configuradas en la base de datos:
    /// - HasMaxLength(50) para TipoVehiculo
    /// - HasMaxLength(20) para Placas
    /// - IsUnique() para Placas (validado manualmente)
    /// - HasDefaultValue(true) para Activo si no se especifica
    /// ✅ REDIS: Invalida caché para mantener consistencia
    /// </summary>
    public async Task<VehiculoResponseDto> CrearAsync(VehiculoRequestDto request)
    {
        // ✅ Validación manual usando el índice único configurado en la base de datos
        await ValidarPlacaUnica(request.Placas);

        // ✅ Creación del modelo - EF aplicará automáticamente:
        // - Mapeo TipoVehiculo → "tipo_vehiculo" VARCHAR(50)
        // - Mapeo Placas → "placas" VARCHAR(20) UNIQUE
        // - Mapeo Activo → "activo" BIT DEFAULT 1
        // - Mapeo EsDeEmpresa → "es_de_empresa" BIT DEFAULT 1
        var vehiculo = new Vehiculo
        {
            TipoVehiculo = request.TipoVehiculo,    // ✅ HasMaxLength(50) aplicado automáticamente
            Transmision = request.Transmision,      // ✅ HasMaxLength(20) aplicado automáticamente
            EsDeEmpresa = request.EsDeEmpresa,      // ✅ HasDefaultValue(true) si no se especifica
            Placas = request.Placas,                // ✅ HasMaxLength(20) + UNIQUE constraint
            Activo = request.Activo,                // ✅ HasDefaultValue(true) si no se especifica
            Observaciones = request.Observaciones,   // ✅ NVARCHAR(MAX) aplicado automáticamente
            NombreVehiculo = request.NombreVehiculo, // ✅ Nuevo campo requerido
            Kilometraje = request.Kilometraje        // ✅ Nuevo campo opcional
        };

        // ✅ Repository Pattern: creación con validaciones automáticas
        var vehiculoCreado = await _vehiculoRepository.CreateAsync(vehiculo);

        // ✅ REDIS: Invalidar caché de listado completo (Write-Through Pattern)
        try
        {
            await _cacheService.RemoveAsync(CACHE_KEY_ALL_VEHICULOS);
            _logger.LogInformation("Vehículo creado con ID: {VehiculoId} y Placas: {Placas}. Caché invalidado.", 
                vehiculoCreado.Id, vehiculoCreado.Placas);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al invalidar caché tras creación de vehículo {VehiculoId}", vehiculoCreado.Id);
        }

        return MapToResponseDto(vehiculoCreado);
    }

    /// <summary>
    /// Actualiza un vehículo existente.
    /// ✅ Usa Repository Pattern para validaciones y actualización
    /// ✅ Verifica unicidad de placas usando el índice configurado
    /// ✅ REDIS: Invalida caché para mantener consistencia
    /// </summary>
    public async Task<VehiculoResponseDto?> ActualizarAsync(int id, VehiculoUpdateDto request)
    {
        // ✅ Repository Pattern: obtener vehículo existente
        var vehiculo = await _vehiculoRepository.GetByIdAsync(id);
        if (vehiculo == null)
        {
            return null;
        }

        // ✅ Validación de unicidad usando Repository Pattern
        if (request.Placas != null && vehiculo.Placas != request.Placas)
        {
            await ValidarPlacaUnica(request.Placas);
        }

        // ✅ Actualizar solo los campos permitidos para edición
        // - Kilometraje es obligatorio y se audita
        // - Placas es opcional y requiere validación de unicidad si cambia
        // - Observaciones es opcional y se audita
        // - Activo es opcional y se audita
        vehiculo.Kilometraje = request.Kilometraje;          // ✅ INT - Auditado (obligatorio)
        if (request.Placas != null)
        {
            vehiculo.Placas = request.Placas;                // ✅ VARCHAR(20) UNIQUE (opcional)
        }
        vehiculo.Observaciones = request.Observaciones;      // ✅ NVARCHAR(MAX) - Auditado (opcional)
        if (request.Activo.HasValue)
        {
            vehiculo.Activo = request.Activo.Value;          // ✅ BIT - Auditado (opcional)
        }

        // ✅ Repository Pattern: actualización con validaciones automáticas
        var vehiculoActualizado = await _vehiculoRepository.UpdateAsync(vehiculo);

        // ✅ REDIS: Invalidar ambos cachés (listado y detalle)
        try
        {
            await InvalidarCacheVehiculo(id);
            _logger.LogInformation("Vehículo actualizado con ID: {VehiculoId}. Caché invalidado.", vehiculoActualizado.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al invalidar caché tras actualización de vehículo {VehiculoId}", id);
        }

        return MapToResponseDto(vehiculoActualizado);
    }

    /// <summary>
    /// Elimina un vehículo.
    /// ✅ Usa Repository Pattern para operaciones de eliminación
    /// ✅ REDIS: Invalida caché para mantener consistencia
    /// </summary>
    public async Task<bool> EliminarAsync(int id)
    {
        // ✅ Repository Pattern: eliminación con validaciones automáticas
        var eliminado = await _vehiculoRepository.DeleteAsync(id);

        if (eliminado)
        {
            // ✅ REDIS: Invalidar ambos cachés
            try
            {
                await InvalidarCacheVehiculo(id);
                _logger.LogInformation("Vehículo eliminado con ID: {VehiculoId}. Caché invalidado.", id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al invalidar caché tras eliminación de vehículo {VehiculoId}", id);
            }
        }

        return eliminado;
    }

    /// <summary>
    /// Obtiene el historial de cambios de un vehículo desde el campo JSON HistorialCambios.
    /// </summary>
    public async Task<IEnumerable<VehiculoHistorialResponseDto>> ObtenerHistorialAsync(int vehiculoId)
    {
        try
        {
            // ✅ REDIS: Caché de historial
            string cacheKey = $"{CACHE_KEY_HISTORIAL_PREFIX}{vehiculoId}";
            var cached = await _cacheService.GetAsync<IEnumerable<VehiculoHistorialResponseDto>>(cacheKey);
            if (cached != null) return cached;

            var vehiculo = await _vehiculoRepository.GetByIdAsync(vehiculoId);
            if (vehiculo == null || string.IsNullOrEmpty(vehiculo.HistorialCambios))
            {
                return new List<VehiculoHistorialResponseDto>();
            }

            // Parsear el JSON del historial y convertirlo al formato esperado
            var historial = JsonSerializer.Deserialize<List<HistorialCambioJson>>(vehiculo.HistorialCambios);
            if (historial == null)
            {
                return new List<VehiculoHistorialResponseDto>();
            }

            // ✅ OPTIMIZACIÓN N+1: Obtener todos los IDs de usuarios únicos
            var userIds = historial
                .Where(h => h.usuario_id.HasValue)
                .Select(h => h.usuario_id!.Value)
                .Distinct()
                .ToList();

            // Cargar usuarios en lote
            var usuariosDict = new Dictionary<int, string>();
            if (userIds.Any())
            {
                try {
                    var usuarios = await _usuarioAuthRepository.GetByIdsAsync(userIds);
                    usuariosDict = usuarios.ToDictionary(u => u.Id, u => $"{u.Nombre} {u.Apellido}");
                } catch (Exception ex) {
                    _logger.LogWarning(ex, "Error al cargar lote de usuarios para historial");
                }
            }

            var resultado = new List<VehiculoHistorialResponseDto>();
            int idCounter = 1;

            foreach (var cambio in historial.OrderByDescending(h => h.fecha))
            {
                // Obtener nombre desde el diccionario (InMemory, súper rápido)
                string usuarioNombre = $"Usuario {cambio.usuario_id ?? 0}";
                if (cambio.usuario_id.HasValue && usuariosDict.TryGetValue(cambio.usuario_id.Value, out var nombre))
                {
                    usuarioNombre = nombre;
                }

                // Para cada cambio, crear entradas separadas por campo modificado
                if (cambio.cambios.kilometraje != null)
                {
                    resultado.Add(new VehiculoHistorialResponseDto
                    {
                        Id = idCounter++,
                        VehiculoId = vehiculoId,
                        CampoModificado = "kilometraje",
                        ValorAnterior = cambio.cambios.kilometraje.anterior,
                        ValorNuevo = cambio.cambios.kilometraje.nuevo,
                        UsuarioId = cambio.usuario_id ?? 0,
                        UsuarioNombre = usuarioNombre,
                        FechaCambio = cambio.fecha,
                        TipoCambio = "Actualización"
                    });
                }

                if (cambio.cambios.observaciones != null)
                {
                    resultado.Add(new VehiculoHistorialResponseDto
                    {
                        Id = idCounter++,
                        VehiculoId = vehiculoId,
                        CampoModificado = "observaciones",
                        ValorAnterior = cambio.cambios.observaciones.anterior,
                        ValorNuevo = cambio.cambios.observaciones.nuevo,
                        UsuarioId = cambio.usuario_id ?? 0,
                        UsuarioNombre = usuarioNombre,
                        FechaCambio = cambio.fecha,
                        TipoCambio = "Actualización"
                    });
                }

                if (cambio.cambios.activo != null)
                {
                    resultado.Add(new VehiculoHistorialResponseDto
                    {
                        Id = idCounter++,
                        VehiculoId = vehiculoId,
                        CampoModificado = "activo",
                        ValorAnterior = cambio.cambios.activo.anterior,
                        ValorNuevo = cambio.cambios.activo.nuevo,
                        UsuarioId = cambio.usuario_id ?? 0,
                        UsuarioNombre = usuarioNombre,
                        FechaCambio = cambio.fecha,
                        TipoCambio = "Actualización"
                    });
                }
            }

            // ✅ REDIS: Guardar
            await _cacheService.SetAsync(cacheKey, resultado, TimeSpan.FromMinutes(CACHE_EXPIRATION_MINUTES));
            return resultado;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener historial para vehículo {VehiculoId}", vehiculoId);
            return new List<VehiculoHistorialResponseDto>();
        }
    }

    #region Métodos Auxiliares

    /// <summary>
    /// ✅ REDIS: Invalida el caché de un vehículo específico y el listado general.
    /// Patrón: Write-Through / Cache Invalidation
    /// </summary>
    private async Task InvalidarCacheVehiculo(int id)
    {
        // Invalidar caché individual
        await _cacheService.RemoveAsync($"{CACHE_KEY_VEHICULO_PREFIX}{id}");
        
        // Invalidar listado completo
        await _cacheService.RemoveAsync(CACHE_KEY_ALL_VEHICULOS);
        
        // ✅ Invalidar caché de historial y uso
        await _cacheService.RemoveAsync($"{CACHE_KEY_HISTORIAL_PREFIX}{id}");
        await _cacheService.RemoveAsync($"{CACHE_KEY_USO_PREFIX}{id}");

        _logger.LogDebug("Cachés de vehículo {Id} invalidados (Detalle, Lista, Historial, Uso)", id);
    }

    /// <summary>
    /// Valida que las placas sean únicas.
    /// ✅ Usa Repository Pattern para consulta eficiente
    /// </summary>
    private async Task ValidarPlacaUnica(string? placas)
    {
        if (string.IsNullOrWhiteSpace(placas))
        {
            return;
        }

        // ✅ Repository Pattern: validación eficiente usando índice único
        var existe = await _vehiculoRepository.PlacasExistAsync(placas);

        if (existe)
        {
            _logger.LogWarning("Intento de crear/actualizar vehículo con placas duplicadas: {Placas}", placas);
            throw new InvalidOperationException($"Las placas '{placas}' ya están registradas.");
        }
    }

    /// <summary>
    /// Mapea un modelo Vehiculo a VehiculoResponseDto.
    /// ✅ Las propiedades ya están validadas por las configuraciones de EF
    /// </summary>
    private VehiculoResponseDto MapToResponseDto(Vehiculo vehiculo)
    {
        return new VehiculoResponseDto
        {
            Id = vehiculo.Id,                          // ✅ ValueGeneratedOnAdd() aplicado
            TipoVehiculo = vehiculo.TipoVehiculo,      // ✅ Mapeado correctamente
            Transmision = vehiculo.Transmision,        // ✅ Mapeado correctamente
            EsDeEmpresa = vehiculo.EsDeEmpresa,        // ✅ Mapeado correctamente
            Placas = vehiculo.Placas,                  // ✅ Mapeado correctamente
            Activo = vehiculo.Activo,                  // ✅ Mapeado correctamente
            Disponible = vehiculo.Disponible,          // ✅ AGREGAR: Estado de disponibilidad
            Observaciones = vehiculo.Observaciones,     // ✅ Mapeado correctamente
            NombreVehiculo = vehiculo.NombreVehiculo,  // ✅ Nuevo campo requerido
            Kilometraje = vehiculo.Kilometraje,         // ✅ Nuevo campo requerido
            CreadoEn = vehiculo.CreadoEn,
            CreadoPorUsuarioId = vehiculo.CreadoPorUsuarioId,
            ActualizadoEn = vehiculo.ActualizadoEn,
            ActualizadoPorUsuarioId = vehiculo.ActualizadoPorUsuarioId,
            HistorialCambios = vehiculo.HistorialCambios
        };
    }

    /// <summary>
    /// Mapea una entidad UsoVehiculo a su correspondiente DTO de respuesta.
    /// Calcula duración en minutos e incluye información del usuario.
    /// </summary>
    private VehiculoUsoResponseDto MapToUsoResponseDto(UsoVehiculo uso)
    {
        return new VehiculoUsoResponseDto
        {
            Id = uso.Id,
            VehiculoId = uso.VehiculoId,
            UsuarioId = uso.UsuarioId,
            UsuarioNombre = uso.Usuario?.Nombre,
            FechaInicio = uso.FechaInicio,
            FechaFin = uso.FechaFin,
            MotivoUso = uso.MotivoUso,
            KilometrajeInicial = uso.KilometrajeInicial,
            KilometrajeFinal = uso.KilometrajeFinal,
            DuracionMinutos = uso.DuracionMinutos,
            Observaciones = uso.Observaciones,
            Estado = uso.Estado
        };
    }

    #endregion

    /// <summary>
    /// Obtiene el ID del usuario actual desde los claims de la sesión HTTP.
    /// </summary>
    private int GetCurrentUserId()
    {
        try
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                _logger.LogDebug("Usuario obtenido de sesión: {UserId}", userId);
                return userId;
            }
            
            _logger.LogWarning("No se pudo obtener el ID del usuario desde los claims de sesión. Usando usuario por defecto (1).");
            return 1; // Usuario por defecto (Sistema)
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al obtener el ID del usuario de sesión. Usando usuario por defecto (1).");
            return 1;
        }
    }
}

