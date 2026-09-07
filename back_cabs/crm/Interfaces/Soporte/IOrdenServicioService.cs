using System.Threading.Tasks;
using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.DTOs.ServiceResponse;
using back_cabs.CRM.DTOs.Legacy;
using back_cabs.CRM.models.legacy;
using System.Collections.Generic;

namespace back_cabs.CRM.Interfaces.Soporte
{
    public interface IOrdenServicioService
    {
        /// <summary>
        /// Crea una orden de servicio completa, insertando en Legacy (AdmDocumento) y Local (Actividad)
        /// dentro de una transacción distribuida.
        /// </summary>
        /// <param name="dto">Datos de la orden de servicio</param>
        /// <returns>El ID del documento creado en Legacy</returns>
        Task<int> CreateOrdenServicioAsync(OrdenServicioCreateRequestDto dto);

        Task UpdateOrdenServicioAsync(int idDocumento, OrdenServicioFinRequestDto dto);

        /// <summary>
        /// Obtiene órdenes de servicio paginadas aplicando filtros
        /// </summary>
        Task<(List<OrdenServicioResponseDto> ordenes, int totalRegistros)> GetOrdenesServicioAsync(AdmDocumentoFilterDto filter);

        /// <summary>
        /// Obtiene una orden de servicio por ID de documento
        /// </summary>
        Task<OrdenServicioResponseDto?> GetOrdenServicioByIdAsync(int id);
        Task<OrdenServicioResponseDto?> IniciarOrdenServicioAsync(OrdenServicioInicioRequestDto dto);
        Task<ServiceResult> FinalizarOrdenServicioAsync(OrdenServicioFinRequestDto dto);

        /// <summary>
        /// Agrega servicios a una orden de servicio existente
        /// </summary>
        /// <param name="dto">Datos de la orden de servicio</param>
        /// <returns>El ID del documento creado en Legacy</returns>
        Task<ServiceResult> AgregarServiciosAsync(OrdenServicioAgregarServiciosDto dto);

        /// <summary>
        /// Asigna un nuevo agente a una orden de servicio existente
        /// </summary>
        /// <param name="OrdenServicioId">ID de la orden de servicio</param>
        /// <param name="NewAgentId">ID del nuevo agente</param>
        /// <returns>El ID del documento creado en Legacy</returns>
        Task<ServiceResult> AssignNewAgentAsync(int OrdenServicioId, int NewAgentId);

        /// <summary>
        /// Edita un servicio
        /// </summary>
        Task<ServiceResult> EditarServicioAsync(OrdenServicioMovimientoDto dto);

        Task<double> GetUltimoNumeroMovimientoAsync(int documentoId);
    }
}
