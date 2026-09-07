using back_cabs.CRM.contexts;
using back_cabs.CRM.Interfaces.Shared;
using back_cabs.CRM.models.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using System.Data;
using System.Text.Json;

// Clases auxiliares para serialización del historial
public class HistorialCambio
{
    public DateTime fecha { get; set; }
    public int? usuario_id { get; set; }
    public Dictionary<string, object> cambios { get; set; } = new Dictionary<string, object>();
}

namespace back_cabs.CRM.repositories.Shared
{
    /// <summary>
    /// Implementación de IVehiculoRepository usando Entity Framework Core.
    /// Encapsula todas las operaciones de BD para Vehículos.
    /// </summary>
    public class VehiculoRepository : IVehiculoRepository
    {
        private readonly WriteContext _writeContext;
        private readonly ReadOnlyContext _readContext;
        private readonly ILogger<VehiculoRepository> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public VehiculoRepository(
            WriteContext writeContext,
            ReadOnlyContext readContext,
            ILogger<VehiculoRepository> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _writeContext = writeContext;
            _readContext = readContext;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Obtiene el ID del usuario actual desde los claims HTTP
        /// </summary>
        private int GetCurrentUserId()
        {
            try
            {
                var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                {
                    return userId;
                }
                
                _logger.LogWarning("No se pudo obtener el ID del usuario desde los claims. Usando usuario por defecto.");
                return 1; // Usuario por defecto (Sistema)
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al obtener el ID del usuario. Usando usuario por defecto.");
                return 1;
            }
        }

        /// <summary>
        /// Registra un evento de auditoría en la tabla de auditoría
        // 📖 IMPLEMENTACIÓN DE LECTURAS

        public async Task<IEnumerable<Vehiculo>> GetAllAsync()
        {
            try
            {
                var vehiculos = await _readContext.Vehiculos
                    .AsNoTracking()
                    .Where(v => v.Activo) // ✅ Solo vehículos activos
                    .OrderBy(v => v.Placas)
                    .ToListAsync();

                _logger.LogDebug("Obtenidos {Count} vehículos activos", vehiculos.Count);
                return vehiculos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener todos los vehículos");
                throw;
            }
        }

        public async Task<Vehiculo?> GetByIdAsync(int id)
        {
            try
            {
                var vehiculo = await _readContext.Vehiculos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(v => v.Id == id);

                if (vehiculo == null)
                {
                    _logger.LogDebug("Vehículo con ID {Id} no encontrado", id);
                }

                return vehiculo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener vehículo con ID {Id}", id);
                throw;
            }
        }

        public async Task<IEnumerable<Vehiculo>> GetByTipoAsync(string tipoVehiculo)
        {
            try
            {
                var vehiculos = await _readContext.Vehiculos
                    .AsNoTracking()
                    .Where(v => v.TipoVehiculo == tipoVehiculo)
                    .OrderBy(v => v.Placas)
                    .ToListAsync();

                _logger.LogDebug("Encontrados {Count} vehículos de tipo {Tipo}",
                    vehiculos.Count, tipoVehiculo);
                return vehiculos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener vehículos por tipo {Tipo}", tipoVehiculo);
                throw;
            }
        }

        public async Task<IEnumerable<Vehiculo>> GetActivosAsync()
        {
            try
            {
                var vehiculos = await _readContext.Vehiculos
                    .AsNoTracking()
                    .Where(v => v.Activo)
                    .OrderBy(v => v.Placas)
                    .ToListAsync();

                _logger.LogDebug("Encontrados {Count} vehículos activos", vehiculos.Count);
                return vehiculos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener vehículos activos");
                throw;
            }
        }

        public async Task<Vehiculo?> GetByPlacasAsync(string placas)
        {
            try
            {
                var vehiculo = await _readContext.Vehiculos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(v => v.Placas == placas);

                if (vehiculo == null)
                {
                    _logger.LogDebug("Vehículo con placas {Placas} no encontrado", placas);
                }

                return vehiculo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al buscar vehículo con placas {Placas}", placas);
                throw;
            }
        }

        public async Task<bool> ExistsAsync(int id)
        {
            try
            {
                var exists = await _readContext.Vehiculos
                    .AnyAsync(v => v.Id == id);

                _logger.LogDebug("Vehículo ID {Id} existe: {Exists}", id, exists);
                return exists;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al verificar existencia de vehículo ID {Id}", id);
                throw;
            }
        }

        public async Task<bool> PlacasExistAsync(string placas)
        {
            try
            {
                var exists = await _readContext.Vehiculos
                    .AnyAsync(v => v.Placas == placas);

                _logger.LogDebug("Placas {Placas} existen: {Exists}", placas, exists);
                return exists;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al verificar existencia de placas {Placas}", placas);
                throw;
            }
        }

        // ✏️ IMPLEMENTACIÓN DE ESCRITURAS

        public async Task<Vehiculo> CreateAsync(Vehiculo vehiculo)
        {
            try
            {
                // Establecer campos de auditoría de creación
                vehiculo.CreadoEn = DateTime.UtcNow;
                vehiculo.CreadoPorUsuarioId = GetCurrentUserId();

                _writeContext.Vehiculos.Add(vehiculo);
                await _writeContext.SaveChangesAsync();

                _logger.LogInformation("Vehículo creado con ID {Id} y placas {Placas}",
                    vehiculo.Id, vehiculo.Placas);

                // La auditoría de creación se maneja automáticamente por triggers en la BD

                return vehiculo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear vehículo con placas {Placas}", vehiculo.Placas);
                throw;
            }
        }

        public async Task<Vehiculo> UpdateAsync(Vehiculo vehiculo)
        {
            try
            {
                // Obtener el vehículo anterior para comparar cambios
                var vehiculoAnterior = await _readContext.Vehiculos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(v => v.Id == vehiculo.Id);

                if (vehiculoAnterior == null)
                {
                    throw new KeyNotFoundException($"Vehículo con ID {vehiculo.Id} no encontrado");
                }

                // Comparar cambios en campos auditables
                var cambios = new Dictionary<string, object>();
                if (vehiculoAnterior.Kilometraje != vehiculo.Kilometraje)
                {
                    cambios["kilometraje"] = new { anterior = vehiculoAnterior.Kilometraje.ToString(), nuevo = vehiculo.Kilometraje.ToString() };
                }
                if (vehiculoAnterior.Observaciones != vehiculo.Observaciones)
                {
                    cambios["observaciones"] = new { anterior = vehiculoAnterior.Observaciones, nuevo = vehiculo.Observaciones };
                }

                // Si hay cambios auditables, actualizar el historial
                if (cambios.Any())
                {
                    var entradaHistorial = new HistorialCambio
                    {
                        fecha = DateTime.UtcNow,
                        usuario_id = GetCurrentUserId(),
                        cambios = cambios
                    };

                    // Obtener historial existente o crear uno nuevo
                    var historialExistente = string.IsNullOrEmpty(vehiculoAnterior.HistorialCambios)
                        ? new List<HistorialCambio>()
                        : JsonSerializer.Deserialize<List<HistorialCambio>>(vehiculoAnterior.HistorialCambios) ?? new List<HistorialCambio>();

                    historialExistente.Add(entradaHistorial);

                    // Serializar de vuelta a JSON
                    vehiculo.HistorialCambios = JsonSerializer.Serialize(historialExistente);
                }
                else
                {
                    // Mantener el historial existente si no hay cambios
                    vehiculo.HistorialCambios = vehiculoAnterior.HistorialCambios;
                }

                // Actualizar campos de auditoría
                vehiculo.ActualizadoEn = DateTime.UtcNow;
                vehiculo.ActualizadoPorUsuarioId = GetCurrentUserId();

                _writeContext.Vehiculos.Update(vehiculo);
                await _writeContext.SaveChangesAsync();

                _logger.LogInformation("Vehículo actualizado con ID {Id}", vehiculo.Id);

                return vehiculo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar vehículo con ID {Id}", vehiculo.Id);
                throw;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                var vehiculo = await _writeContext.Vehiculos.FindAsync(id);
                if (vehiculo == null)
                {
                    _logger.LogDebug("Vehículo ID {Id} no encontrado para eliminación", id);
                    return false;
                }

                _writeContext.Vehiculos.Remove(vehiculo);
                await _writeContext.SaveChangesAsync();

                _logger.LogInformation("Vehículo eliminado con ID {Id}", id);

                // La auditoría de eliminación se maneja automáticamente por triggers en la BD

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar vehículo con ID {Id}", id);
                throw;
            }
        }

        // ✅ TRANSACCIONAL - Operaciones Compuestas Atómicas

        /// <summary>
        /// ✅ TRANSACCIONAL: Registra el inicio de uso de un vehículo de forma atómica.
        /// 
        /// OPERACIONES ATÓMICAS:
        /// 1. Obtiene el vehículo actual (para validaciones)
        /// 2. Verifica que esté disponible
        /// 3. Crea registro en UsoVehiculo
        /// 4. Marca vehículo como NO disponible (Disponible = false)
        /// 5. Actualiza kilometraje si es necesario
        /// 
        /// ✅ GARANTÍA: Si alguna operación falla, se hace ROLLBACK de TODAS
        /// Esto previene estados inconsistentes como:
        /// - Vehículo marcado como ocupado sin registro de uso
        /// - Registro de uso creado pero vehículo aún disponible
        /// </summary>
        public async Task<Vehiculo> RegistrarInicioUsoCompletoAsync(int vehiculoId, UsoVehiculo usoVehiculo, int kilomterjajeInicial)
        {
            // ✅ CORRECCIÓN: Usar ExecutionStrategy para ser compatible con políticas de retry de SQL Server
            var strategy = _writeContext.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _writeContext.Database.BeginTransactionAsync();
                try
                {
                    // 1. Obtener vehículo existente
                    var vehiculo = await _writeContext.Vehiculos.FindAsync(vehiculoId);
                    if (vehiculo == null)
                    {
                        throw new KeyNotFoundException($"Vehículo con ID {vehiculoId} no encontrado");
                    }

                    // 2. Verificar disponibilidad
                    if (!vehiculo.Disponible)
                    {
                        throw new InvalidOperationException($"El vehículo {vehiculo.Placas} no está disponible para uso");
                    }

                    // 3. Crear registro de uso
                    usoVehiculo.VehiculoId = vehiculoId;
                    usoVehiculo.FechaCreacion = DateTime.UtcNow;
                    usoVehiculo.Estado = "EN_USO";
                    
                    _writeContext.Set<UsoVehiculo>().Add(usoVehiculo);
                    await _writeContext.SaveChangesAsync();

                    // 4. Marcar vehículo como NO disponible
                    vehiculo.Disponible = false;

                    // 5. Actualizar kilometraje si el inicial es mayor
                    if (kilomterjajeInicial > vehiculo.Kilometraje)
                    {
                        vehiculo.Kilometraje = kilomterjajeInicial;
                    }

                    // Actualizar campos de auditoría
                    vehiculo.ActualizadoEn = DateTime.UtcNow;
                    vehiculo.ActualizadoPorUsuarioId = GetCurrentUserId();

                    _writeContext.Vehiculos.Update(vehiculo);
                    await _writeContext.SaveChangesAsync();

                    // ✅ COMMIT: Todas las operaciones exitosas
                    await transaction.CommitAsync();

                    _logger.LogInformation(
                        "Inicio de uso registrado ATÓMICAMENTE para vehículo {Placas} (ID: {Id}). UsoVehiculo ID: {UsoId}",
                        vehiculo.Placas, vehiculoId, usoVehiculo.Id);

                    return vehiculo;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, 
                        "Error CRÍTICO al registrar inicio de uso atómico para vehículo ID {Id}. ROLLBACK ejecutado para prevenir orfandad.",
                        vehiculoId);
                    throw;
                }
            });
        }

        /// <summary>
        /// ✅ TRANSACCIONAL: Finaliza el uso de un vehículo de forma atómica.
        /// 
        /// OPERACIONES ATÓMICAS:
        /// 1. Obtiene el registro de uso activo
        /// 2. Actualiza registro de uso (FechaFin, KilometrajeFinal, Estado)
        /// 3. Obtiene y valida el vehículo
        /// 4. Marca vehículo como disponible (Disponible = true)
        /// 5. Actualiza kilometraje del vehículo
        /// 
        /// ✅ GARANTÍA: Si alguna operación falla, se hace ROLLBACK de TODAS
        /// Esto previene estados inconsistentes como:
        /// - Vehículo marcado como disponible sin cerrar el uso
        /// - Registro de uso actualizado pero vehículo aún ocupado
        /// </summary>
        public async Task<Vehiculo> FinalizarUsoCompletoAsync(int vehiculoId, UsoVehiculo usoVehiculo, int kilomtrajeFinal)
        {
            // ✅ CORRECCIÓN: Usar ExecutionStrategy para ser compatible con políticas de retry de SQL Server
            var strategy = _writeContext.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _writeContext.Database.BeginTransactionAsync();
                try
                {
                    // 1. Actualizar registro de uso
                    usoVehiculo.FechaActualizacion = DateTime.UtcNow;
                    _writeContext.Set<UsoVehiculo>().Update(usoVehiculo);
                    await _writeContext.SaveChangesAsync();

                    // 2. Obtener vehículo existente
                    var vehiculo = await _writeContext.Vehiculos.FindAsync(vehiculoId);
                    if (vehiculo == null)
                    {
                        throw new KeyNotFoundException($"Vehículo con ID {vehiculoId} no encontrado");
                    }

                    // 3. Marcar vehículo como disponible
                    vehiculo.Disponible = true;

                    // 4. Actualizar kilometraje
                    vehiculo.Kilometraje = kilomtrajeFinal;

                    // Actualizar campos de auditoría
                    vehiculo.ActualizadoEn = DateTime.UtcNow;
                    vehiculo.ActualizadoPorUsuarioId = GetCurrentUserId();

                    _writeContext.Vehiculos.Update(vehiculo);
                    await _writeContext.SaveChangesAsync();

                    // ✅ COMMIT: Todas las operaciones exitosas
                    await transaction.CommitAsync();

                    _logger.LogInformation(
                        "Finalización de uso registrada ATÓMICAMENTE para vehículo {Placas} (ID: {Id}). UsoVehiculo ID: {UsoId}",
                        vehiculo.Placas, vehiculoId, usoVehiculo.Id);

                    return vehiculo;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, 
                        "Error CRÍTICO al finalizar uso atómico para vehículo ID {Id}. ROLLBACK ejecutado para prevenir orfandad.",
                        vehiculoId);
                    throw;
                }
            });
        }
    }
}