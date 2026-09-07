using Microsoft.EntityFrameworkCore;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.models.Soporte;
using back_cabs.CRM.contexts;
using System.Linq;

namespace back_cabs.CRM.Repositories.Soporte
{
    public class OrdenServicioPruebasRepository : IOrdenServicioPruebasRepository
    {
        private readonly WriteContext _context;
        private readonly LegacyCompacReadOnlyContext _legacyContext;

        public OrdenServicioPruebasRepository(
            WriteContext context,
            LegacyCompacReadOnlyContext legacyContext)
        {
            _context = context;
            _legacyContext = legacyContext;
        }

        public async Task<OrdenServicioActividad> CreateAsync(OrdenServicioActividad entity)
        {
            _context.Set<OrdenServicioActividad>().Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<List<OrdenServicioActividad>> GetAllAsync()
        {
            return await _context.Set<OrdenServicioActividad>()
                .OrderByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<(List<OrdenServicioActividad> Items, int TotalItems)> SearchAsync(
            string? folio,
            string? estadoOrden,
            int? agentePrincipalId,
            int? agenteAuxiliarId,
            DateTime? fechaInicio,
            DateTime? fechaFin,
            int page,
            int pageSize)
        {
            var query = await BuildSearchQueryAsync(
                folio,
                estadoOrden,
                agentePrincipalId,
                agenteAuxiliarId,
                fechaInicio,
                fechaFin);

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.FechaCreacion)
                .ThenByDescending(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalItems);
        }

        public async Task<OrdenServicioPruebasResumenDto> GetResumenAsync(
            string? folio,
            string? estadoOrden,
            int? agentePrincipalId,
            int? agenteAuxiliarId,
            DateTime? fechaInicio,
            DateTime? fechaFin)
        {
            var query = await BuildSearchQueryAsync(
                folio,
                estadoOrden,
                agentePrincipalId,
                agenteAuxiliarId,
                fechaInicio,
                fechaFin);

            return await query
                .GroupBy(_ => 1)
                .Select(g => new OrdenServicioPruebasResumenDto
                {
                    TotalOrdenes = g.Count(),
                    OrdenesEnEspera = g.Count(x => x.EstadoOrden != null && x.EstadoOrden.ToUpper() == "PENDIENTE"),
                    OrdenesEnProceso = g.Count(x => x.EstadoOrden != null && x.EstadoOrden.ToUpper() == "EN_PROCESO"),
                    OrdenesTerminadas = g.Count(x => x.EstadoOrden != null && x.EstadoOrden.ToUpper() == "FINALIZADO")
                })
                .FirstOrDefaultAsync()
                ?? new OrdenServicioPruebasResumenDto();
        }

        public async Task<OrdenServicioActividad?> GetByDocumentoIdAsync(int documentoId)
        {
            return await _context.Set<OrdenServicioActividad>()
                .FirstOrDefaultAsync(x => x.DocumentoId == documentoId);
        }

        public async Task<bool> UpdateAsync(OrdenServicioActividad entity)
        {
            _context.Set<OrdenServicioActividad>().Update(entity);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<OrdenServicioEntregable>> GetEntregablesByActividadIdAsync(int actividadId)
        {
            return await _context.Set<OrdenServicioEntregable>()
                .Where(x => x.OrdenServicioActividadId == actividadId)
                .OrderByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<OrdenServicioEntregable?> GetEntregableByIdAsync(int entregableId)
        {
            return await _context.Set<OrdenServicioEntregable>()
                .FirstOrDefaultAsync(x => x.Id == entregableId);
        }

        public async Task<OrdenServicioEntregable> AddEntregableAsync(OrdenServicioEntregable entity)
        {
            _context.Set<OrdenServicioEntregable>().Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<bool> UpdateEntregableAsync(OrdenServicioEntregable entity)
        {
            _context.Set<OrdenServicioEntregable>().Update(entity);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteEntregableAsync(OrdenServicioEntregable entity)
        {
            _context.Set<OrdenServicioEntregable>().Remove(entity);
            return await _context.SaveChangesAsync() > 0;
        }

        private static string? NormalizeFolioSearch(string? folio)
        {
            if (string.IsNullOrWhiteSpace(folio))
            {
                return null;
            }

            var normalized = folio.Trim().ToUpperInvariant();
            if (normalized.StartsWith("ORD-"))
            {
                normalized = normalized[4..];
            }

            normalized = new string(normalized.Where(char.IsDigit).ToArray());
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return null;
            }

            normalized = normalized.TrimStart('0');
            return string.IsNullOrWhiteSpace(normalized) ? "0" : normalized;
        }

        private async Task<IQueryable<OrdenServicioActividad>> BuildSearchQueryAsync(
            string? folio,
            string? estadoOrden,
            int? agentePrincipalId,
            int? agenteAuxiliarId,
            DateTime? fechaInicio,
            DateTime? fechaFin)
        {
            var query = _context.Set<OrdenServicioActividad>()
                .AsNoTracking()
                .AsQueryable();

            if (fechaInicio.HasValue)
            {
                query = query.Where(x => x.FechaCreacion >= fechaInicio.Value);
            }

            if (fechaFin.HasValue)
            {
                query = query.Where(x => x.FechaCreacion <= fechaFin.Value);
            }

            if (!string.IsNullOrWhiteSpace(estadoOrden))
            {
                var estadoNormalizado = estadoOrden.Trim().ToUpperInvariant();
                query = query.Where(x => x.EstadoOrden != null && x.EstadoOrden.ToUpper() == estadoNormalizado);
            }

            if (agenteAuxiliarId.HasValue)
            {
                var auxiliarToken = $",{agenteAuxiliarId.Value},";
                query = query.Where(x =>
                    x.AgenteAuxiliar != null &&
                    ("," + x.AgenteAuxiliar + ",").Contains(auxiliarToken));
            }

            var normalizedFolio = NormalizeFolioSearch(folio);
            if (!string.IsNullOrWhiteSpace(normalizedFolio))
            {
                query = query.Where(x => x.DocumentoId.ToString().Contains(normalizedFolio));
            }

            if (agentePrincipalId.HasValue)
            {
                var documentoIds = await _legacyContext.AdmDocumentos
                    .AsNoTracking()
                    .Where(d => d.CIdAgente == agentePrincipalId.Value)
                    .Select(d => d.CIdDocumento)
                    .ToListAsync();

                query = documentoIds.Count == 0
                    ? query.Where(_ => false)
                    : query.Where(x => EF.Constant(documentoIds).Contains(x.DocumentoId));
            }

            return query;
        }
    }
}