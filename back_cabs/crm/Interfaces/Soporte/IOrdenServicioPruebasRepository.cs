using back_cabs.CRM.models.Soporte;
using back_cabs.CRM.DTOs.Response;

namespace back_cabs.CRM.Interfaces.Soporte
{
    public interface IOrdenServicioPruebasRepository
    {
        Task<OrdenServicioActividad> CreateAsync(OrdenServicioActividad entity);
        Task<List<OrdenServicioActividad>> GetAllAsync();
        Task<(List<OrdenServicioActividad> Items, int TotalItems)> SearchAsync(
            string? folio,
            string? estadoOrden,
            int? agentePrincipalId,
            int? agenteAuxiliarId,
            DateTime? fechaInicio,
            DateTime? fechaFin,
            int page,
            int pageSize);
        Task<OrdenServicioPruebasResumenDto> GetResumenAsync(
            string? folio,
            string? estadoOrden,
            int? agentePrincipalId,
            int? agenteAuxiliarId,
            DateTime? fechaInicio,
            DateTime? fechaFin);
        Task<OrdenServicioActividad?> GetByDocumentoIdAsync(int documentoId);
        Task<bool> UpdateAsync(OrdenServicioActividad entity);

        Task<List<OrdenServicioEntregable>> GetEntregablesByActividadIdAsync(int actividadId);
        Task<OrdenServicioEntregable?> GetEntregableByIdAsync(int entregableId);
        Task<OrdenServicioEntregable> AddEntregableAsync(OrdenServicioEntregable entity);
        Task<bool> UpdateEntregableAsync(OrdenServicioEntregable entity);
        Task<bool> DeleteEntregableAsync(OrdenServicioEntregable entity);
    }
}