using back_cabs.CRM.models.Files;
using back_cabs.CRM.models.Soporte;

namespace back_cabs.CRM.Interfaces.Soporte
{
    public interface IActividadRepository
    {
        Task<Actividad> CreateAsync(Actividad actividad);

        Task<List<Actividad>> GetAllAsync();

        Task<Actividad?> GetByIdAsync(int id);

        Task<bool> UpdateAsync(Actividad actividad);

        Task DeleteAsync(int id);

        Task<Actividad?> GetByDocumentoIdAsync(int documentoId);

        Task<Actividad?> RegistrarHoraInicioAsync(int actividadId, DateTime horaInicio, bool? usaVehiculo, int? vehiculoId = null);

        Task<Actividad?> RegistrarHoraFinAsync(int actividadId, DateTime horaFin, int? vehiculoId = null);

    }
}
