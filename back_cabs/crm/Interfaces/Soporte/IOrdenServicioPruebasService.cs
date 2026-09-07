using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Response;

namespace back_cabs.CRM.Interfaces.Soporte
{
    public interface IOrdenServicioPruebasService
    {
        Task<OrdenServicioPruebasResponseDto> CreateAsync(OrdenServicioPruebasCreateRequestDto dto);
        Task<List<OrdenServicioPruebasResponseDto>> GetAllAsync();
        Task<OrdenServicioPruebasPagedResponseDto> SearchAsync(OrdenServicioPruebasListRequestDto filter);
        Task<OrdenServicioPruebasResponseDto> PatchEstadoAsync(int documentoId, OrdenServicioPruebasPatchEstadoDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchFacturaAsync(int documentoId, OrdenServicioPruebasPatchFacturaDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchFinancieroAsync(int documentoId, OrdenServicioPruebasPatchFinancieroDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchAgentePrincipalAsync(int documentoId, OrdenServicioPruebasPatchAgentePrincipalDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchAgentesAuxiliaresAsync(int documentoId, OrdenServicioPruebasPatchAgentesAuxiliaresDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchObservacionesAsync(int documentoId, OrdenServicioPruebasPatchObservacionesDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchNotaSoporteAsync(int documentoId, OrdenServicioPruebasPatchNotaSoporteDto dto);

        Task<List<OrdenServicioPruebasEntregableResponseDto>> GetEntregablesAsync(int documentoId);
        Task<OrdenServicioPruebasEntregableResponseDto> AddEntregableAsync(int documentoId, OrdenServicioPruebasAddEntregableDto dto, string? usuario);
        Task<OrdenServicioPruebasEntregableResponseDto> UpdateEntregableAsync(int documentoId, int entregableId, OrdenServicioPruebasUpdateEntregableDto dto);
        Task<bool> DeleteEntregableAsync(int documentoId, int entregableId);
        Task<OrdenServicioPruebasResponseDto> EnviarConFacturaAsync(int documentoId, OrdenServicioPruebasEnviarConFacturaDto dto);        
        Task<OrdenServicioPruebasDetalleResponseDto> GetDetalleAsync(int documentoId);
        Task<OrdenServicioPruebasResponseDto> PatchDireccionAsync(int documentoId, OrdenServicioPruebasPatchDireccionDto dto);
        Task<OrdenServicioPruebasResponseDto> PatchClienteAsync(int documentoId, OrdenServicioPruebasPatchClienteDto dto);
    }
}