using back_cabs.CRM.contexts;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.models.Soporte;
using Microsoft.EntityFrameworkCore;
using back_cabs.CRM.services.Fleet;
using back_cabs.CRM.models.Shared;

namespace back_cabs.CRM.repositories.Soporte
{
    public class ActividadRepository : IActividadRepository
    {
        private readonly WriteContext _writeContext;
        private readonly ReadOnlyContext _readContext;
        private readonly ILogger<ActividadRepository> _logger;
        private readonly VehiculosService _vehiculosService;
        public ActividadRepository(
            WriteContext writeContext,
            ReadOnlyContext readContext,
            ILogger<ActividadRepository> logger,
            VehiculosService vehiculosService)
        {
            _writeContext = writeContext;
            _readContext = readContext;
            _logger = logger;
            _vehiculosService = vehiculosService;
        }

        public async Task<Actividad> CreateAsync(Actividad actividad)
        {
            try
            {
                await _writeContext.Actividades.AddAsync(actividad);
                await _writeContext.SaveChangesAsync();
                return actividad;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear la actividad");
                throw;
            }
        }

        public async Task<List<Actividad>> GetAllAsync()
        {
            try
            {
                return await _readContext.Actividades.AsNoTracking().ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener las actividades");
                throw;
            }
        }

        public async Task<Actividad?> GetByIdAsync(int id)
        {
            try
            {
                return await _readContext.Actividades
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.Id == id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener la actividad con ID {Id}", id);
                throw;
            }
        }

        public async Task<bool> UpdateAsync(Actividad actividad)
        {
            try
            {
                _writeContext.Actividades.Update(actividad);
                await _writeContext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar la actividad con ID {Id}", actividad.Id);
                throw;
            }
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                var actividad = await _writeContext.Actividades.FindAsync(id);
                if (actividad != null)
                {
                    _writeContext.Actividades.Remove(actividad);
                    await _writeContext.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar la actividad con ID {Id}", id);
                throw;
            }
        }
        public async Task<Actividad?> GetByDocumentoIdAsync(int documentoId)
        {
            try
            {
                return await _readContext.Actividades
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.DocumentoId == documentoId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener la actividad para el Documento ID {DocumentoId}", documentoId);
                throw;
            }
        }

        public async Task<Actividad?> RegistrarHoraInicioAsync(int actividadId, DateTime horaInicio, bool? usaVehiculo, int? vehiculoId)
        {
            try
            {
                // Buscamos en el contexto de escritura para modificar
                var actividad = await _writeContext.Actividades
                    .FirstOrDefaultAsync(a => a.Id == actividadId);

                if (actividad == null)
                    return null;

                actividad.HoraInicio = horaInicio;
                //Validar uso de vehiculo
                if (usaVehiculo.HasValue)
                {
                    actividad.VehiculoId = vehiculoId;
                }
                else
                {
                    actividad.VehiculoId = null;
                }

                _writeContext.Actividades.Update(actividad);
                await _writeContext.SaveChangesAsync();

                return actividad;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Error al actualizar fecha inicio actividad {Id}", actividadId);
                throw new Exception("Error al registrar hora de inicio en la base de datos", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al registrar fecha inicio actividad {Id}", actividadId);
                throw new Exception("Error al registrar hora de inicio", ex);
            }
        }

        public async Task<Actividad?> RegistrarHoraFinAsync(int actividadId, DateTime horaFin, int? vehiculoId = null)
        {
            try
            {
                // Buscamos en el contexto de escritura para modificar
                var actividad = await _writeContext.Actividades
                    .FirstOrDefaultAsync(a => a.Id == actividadId);

                if (actividad == null)
                    return null;

                actividad.HoraFin = horaFin;

                _writeContext.Actividades.Update(actividad);
                await _writeContext.SaveChangesAsync();

                return actividad;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Error al actualizar fecha fin actividad {Id}", actividadId);
                throw new Exception("Error al registrar hora de fin en la base de datos", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al registrar fecha fin actividad {Id}", actividadId);
                throw new Exception("Error al registrar hora de fin", ex);
            }
        }
    }
}
