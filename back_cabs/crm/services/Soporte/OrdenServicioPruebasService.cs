using System.Linq;
using System.Globalization;
using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.Interfaces.Legacy;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.models.legacy;
using back_cabs.CRM.models.Soporte;

namespace back_cabs.CRM.services.Soporte
{
    public class OrdenServicioPruebasService : IOrdenServicioPruebasService
    {
        private readonly IOrdenServicioService _ordenServicioService;
        private readonly IOrdenServicioPruebasRepository _repo;
        private readonly IAdmOrdenServicioRepository _admOrdenServicioRepository;
        private readonly IAdmClienteRepository _clienteRepository;
        private readonly IAdmAgenteRepository _agenteRepository;
        public OrdenServicioPruebasService(
            IOrdenServicioPruebasRepository repo,
            IOrdenServicioService ordenServicioService,
            IAdmOrdenServicioRepository admOrdenServicioRepository,
            IAdmClienteRepository clienteRepository,
            IAdmAgenteRepository agenteRepository)
        {
            _repo = repo;
            _ordenServicioService = ordenServicioService;
            _admOrdenServicioRepository = admOrdenServicioRepository;
            _clienteRepository = clienteRepository;
            _agenteRepository = agenteRepository;
        }

        public async Task<OrdenServicioPruebasResponseDto> CreateAsync(OrdenServicioPruebasCreateRequestDto dto)
        {
            if (dto.ClienteId <= 0)
                throw new ArgumentException("clienteId es requerido y debe ser mayor a 0.");

            if (!dto.AgentePrincipal.HasValue || dto.AgentePrincipal.Value <= 0)
                throw new ArgumentException("agentePrincipal es requerido y debe ser mayor a 0.");

            var estadoFactura = NormalizeEstadoFactura(dto.EstadoFactura);

            var cliente = await _clienteRepository.GetByIdWithDomicilioAsync(dto.ClienteId);
            if (cliente == null)
                throw new ArgumentException("Cliente no encontrado.");

            var agente = await _agenteRepository.GetByIdAsync(dto.AgentePrincipal.Value);
            if (agente == null)
                throw new ArgumentException("Agente principal no encontrado.");

            var fechaDocumento = DateTime.Now;

            var documento = new AdmDocumento
            {
                CIdDocumentoDe = 2,
                CIdConceptoDocumento = 3003,
                CSerieDocumento = "OS",
                CFecha = fechaDocumento,
                CFechaExtra = fechaDocumento,
                CFechaVencimiento = fechaDocumento,
                CFechaProntoPago = fechaDocumento,
                CFechaEntregaRecepcion = fechaDocumento,
                CFechaUltimoInteres = fechaDocumento,
                CIdClienteProveedor = dto.ClienteId,
                CIdAgente = dto.AgentePrincipal.Value,
                CRazonSocial = cliente.CRazonSocial,
                CRfc = cliente.CRfc,
                CReferencia = dto.DocumentoId > 0
                    ? Truncate($"OS-{dto.DocumentoId}", 20)
                    : "OS",
                CTextoExtra1 = string.Empty,
                CTextoExtra2 = string.Empty,
                CTextoExtra3 = string.Empty,
                CObservaciones = dto.Observaciones,
                CNeto = 0,
                CCancelado = 0,
                CIdMoneda = 1,
                CTipoCambio = 1,
                CNaturaleza = 0,
                CIdDocumentoOrigen = 0,
                CPlantilla = 0,
                CUsaCliente = 1,
                CUsaProveedor = 0,
                CAfectado = 0,
                CImpreso = 0,
                CDevuelto = 0,
                CImpuesto1 = 0,
                CPorcentajeImpuesto1 = 16,
                CImpuesto2 = 0,
                CImpuesto3 = 0,
                CTotal = 0,
                CPendiente = 0,
                CIdPrepoliza = 0,
                CIdPrepolizaCancelacion = 0,
                CEstadoContable = 0,
                CTimestamp = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss:fff"),
                CUsuario = "SISTEMA",
                CDestinatario = "",
                CNumeroGuia = "",
                CMensajeria = "",
                CCuentaMensajeria = "",
                CLugarExpe = "",
                CMetodoPag = "",
                CCondiPago = "",
                CNumCtaPag = "",
                CGuidDocumento = Guid.NewGuid().ToString(),
                CTransactionId = "",
                CVerEsque = "",
                CIdApertura = 0
            };

            var documentoId = await _admOrdenServicioRepository.CreateDocumentoOrdenServicioAsync(documento);

            var actividad = new OrdenServicioActividad
            {
                DocumentoId = documentoId,
                EsVirtual = dto.EsVirtual,
                FechaCreacion = fechaDocumento,
                AgenteAuxiliar = dto.AgenteAuxiliar,
                TituloEvento = dto.TituloEvento,
                FechaStart = dto.FechaStart,
                FechaEnd = dto.FechaEnd,
                NombreSolicitante = dto.NombreSolicitante,
                NombreDestinatario = dto.NombreDestinatario,
                ContactoSolicitante = dto.ContactoSolicitante,
                ContactoDestinatario = dto.ContactoDestinatario,
                UrlImagen = dto.UrlImagen,
                CredencialesEscritas = dto.CredencialesEscritas,
                EstadoOrden = "PENDIENTE",
                EstadoFactura = estadoFactura,
                DireccionGoogleMaps = dto.DireccionGoogleMaps,
                GooglePlaceId = dto.GooglePlaceId,
                Latitud = dto.Latitud,
                Longitud = dto.Longitud
            };

            try
            {
                var created = await _repo.CreateAsync(actividad);
                return ToDto(created);
            }
            catch (Exception ex)
            {
                // Compensación: intentar eliminar el documento recién creado para mantener consistencia
                try
                {
                    await _admOrdenServicioRepository.DeleteDocumentoAsync(documentoId);
                }
                catch (Exception compEx)
                {
                    throw new Exception(
                        $"Error crítico: no se pudo crear la actividad y tampoco revertir el documento {documentoId}. " +
                        $"Error original: {ex.Message}. Error compensación: {compEx.Message}", ex);
                }
                throw;
            }
        }

        public async Task<List<OrdenServicioPruebasResponseDto>> GetAllAsync()
        {
            var list = await _repo.GetAllAsync();
            var documentosIds = list.Select(x => x.DocumentoId).Distinct().ToList();
            var documentos = await _admOrdenServicioRepository.GetDocumentosByIdsAsync(documentosIds);
            var documentosById = documentos.ToDictionary(d => d.CIdDocumento, d => d);

            return list.Select(x =>
            {
                documentosById.TryGetValue(x.DocumentoId, out var documento);
                return ToDto(x, documento);
            }).ToList();
        }

        public async Task<OrdenServicioPruebasPagedResponseDto> SearchAsync(OrdenServicioPruebasListRequestDto filter)
        {
            if (filter.Page < 1)
                throw new ArgumentException("page debe ser mayor o igual a 1.");

            if (filter.PageSize < 1 || filter.PageSize > 100)
                throw new ArgumentException("pageSize debe estar entre 1 y 100.");

            var fechaInicio = ParseDate(filter.FechaInicio, "fechaInicio", false);
            var fechaFin = ParseDate(filter.FechaFin, "fechaFin", true);

            if (!filter.HasExplicitFilters())
            {
                var now = DateTime.Now;
                fechaInicio = new DateTime(now.Year, now.Month, 1, 0, 0, 0, now.Kind);
                fechaFin = fechaInicio.Value.AddMonths(1).AddTicks(-1);
            }

            if (fechaInicio.HasValue && fechaFin.HasValue && fechaInicio.Value > fechaFin.Value)
                throw new ArgumentException("fechaInicio no puede ser mayor que fechaFin.");

            var resumenGlobal = await _repo.GetResumenAsync(
                filter.Folio,
                null,
                filter.AgentePrincipalId,
                filter.AgenteAuxiliarId,
                fechaInicio,
                fechaFin);

            var resumenFiltrado = string.IsNullOrWhiteSpace(filter.EstadoOrden)
                ? resumenGlobal
                : await _repo.GetResumenAsync(
                    filter.Folio,
                    filter.EstadoOrden,
                    filter.AgentePrincipalId,
                    filter.AgenteAuxiliarId,
                    fechaInicio,
                    fechaFin);

            var (items, totalItems) = await _repo.SearchAsync(
                filter.Folio,
                filter.EstadoOrden,
                filter.AgentePrincipalId,
                filter.AgenteAuxiliarId,
                fechaInicio,
                fechaFin,
                filter.Page,
                filter.PageSize);

            var documentosIds = items.Select(x => x.DocumentoId).Distinct().ToList();
            var documentos = await _admOrdenServicioRepository.GetDocumentosByIdsAsync(documentosIds);
            var documentosById = documentos.ToDictionary(d => d.CIdDocumento, d => d);

            var mappedItems = items.Select(x =>
            {
                documentosById.TryGetValue(x.DocumentoId, out var documento);
                return ToDto(x, documento);
            }).ToList();

            return new OrdenServicioPruebasPagedResponseDto
            {
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)filter.PageSize),
                ResumenGlobal = resumenGlobal,
                ResumenFiltrado = resumenFiltrado,
                Items = mappedItems
            };
        }

        public async Task<OrdenServicioPruebasDetalleResponseDto> GetDetalleAsync(int documentoId)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            var entregables = await _repo.GetEntregablesByActividadIdAsync(os.Id);
            var servicios = await _admOrdenServicioRepository.GetServicioByDocumentoIdAsync(documentoId);

            // Cargar admDocumento para obtener CIDAGENTE real (idAgentePrincipal)
            var documentos = await _admOrdenServicioRepository.GetDocumentosByIdsAsync([documentoId]);
            var documento = documentos.FirstOrDefault();

            return new OrdenServicioPruebasDetalleResponseDto
            {
                Orden = ToDto(os, documento),
                Entregables = entregables.Select(ToEntregableDto).ToList(),
                Servicios = servicios
            };
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchEstadoAsync(int documentoId, OrdenServicioPruebasPatchEstadoDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            var estado = (dto.EstadoOrden ?? "").Trim().ToUpperInvariant();

            if (estado == "PENDIENTE")
            {
                os.EstadoOrden = "PENDIENTE";
            }
            else if (estado == "EN_PROCESO")
            {
                os.EstadoOrden = "EN_PROCESO";
                if (!os.FechaInicio.HasValue) os.FechaInicio = DateTime.UtcNow;
            }
            else if (estado == "FINALIZADO")
            {
                os.EstadoOrden = "FINALIZADO";
                if (!os.FechaInicio.HasValue) os.FechaInicio = DateTime.UtcNow;

                os.FechaFinal = DateTime.UtcNow;
                os.TotalHoras = CalculateBusinessHours(os.FechaInicio.Value, os.FechaFinal.Value);
            }
            else
            {
                throw new ArgumentException("Estado inválido. Usa PENDIENTE, EN_PROCESO o FINALIZADO.");
            }

            await _repo.UpdateAsync(os);
            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchFacturaAsync(int documentoId, OrdenServicioPruebasPatchFacturaDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            var estado = (dto.EstadoFactura ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(estado))
                estado = "PENDIENTE";

            if (estado == "CON FACTURA") estado = "CONFACTURA";
            if (estado == "SIN FACTURA") estado = "SIN_FACTURA";

            var permitidos = new[] { "PENDIENTE", "CONFACTURA", "SIN_FACTURA" };
            if (!permitidos.Contains(estado))
                throw new ArgumentException("EstadoFactura inválido. Usa: PENDIENTE, CONFACTURA o SIN_FACTURA.");

            os.EstadoFactura = estado;
            await _repo.UpdateAsync(os);
            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchFinancieroAsync(int documentoId, OrdenServicioPruebasPatchFinancieroDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");
            if (dto.Subtotal < 0) throw new ArgumentException("Subtotal no puede ser negativo.");

            os.Subtotal = Math.Round(dto.Subtotal, 2, MidpointRounding.AwayFromZero);
            os.TotalConIva = Math.Round(os.Subtotal.Value * 1.16m, 2, MidpointRounding.AwayFromZero);
            os.Iva = Math.Round(os.TotalConIva.Value - os.Subtotal.Value, 2, MidpointRounding.AwayFromZero);

            await _repo.UpdateAsync(os);
            return ToDto(os);
        }

        public async Task<List<OrdenServicioPruebasEntregableResponseDto>> GetEntregablesAsync(int documentoId)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            var items = await _repo.GetEntregablesByActividadIdAsync(os.Id);
            return items.Select(ToEntregableDto).ToList();
        }

        public async Task<OrdenServicioPruebasEntregableResponseDto> AddEntregableAsync(int documentoId, OrdenServicioPruebasAddEntregableDto dto, string? usuario)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoFactura ?? "").ToUpperInvariant() == "CONFACTURA")
                throw new InvalidOperationException("No se pueden modificar entregables en una orden CONFACTURA.");

            var tipo = (dto.Tipo ?? "PRODUCTO").Trim().ToUpperInvariant();
            if (tipo != "PRODUCTO" && tipo != "SERVICIO_ASESORIA")
                throw new ArgumentException("Tipo inválido. Usa PRODUCTO o SERVICIO_ASESORIA.");
            if (string.IsNullOrWhiteSpace(dto.CodigoProducto))
                throw new ArgumentException("CodigoProducto es requerido.");
            if (string.IsNullOrWhiteSpace(dto.NombreProducto))
                throw new ArgumentException("NombreProducto es requerido.");
            if (dto.Cantidad <= 0)
                throw new ArgumentException("Cantidad debe ser mayor a 0.");

            var entity = new OrdenServicioEntregable
            {
                OrdenServicioActividadId = os.Id,
                Tipo = tipo,
                CodigoProducto = dto.CodigoProducto.Trim(),
                NombreProducto = dto.NombreProducto.Trim(),
                Cantidad = Math.Round(dto.Cantidad, 2, MidpointRounding.AwayFromZero),
                PrecioUnitario = dto.PrecioUnitario.HasValue
                    ? Math.Round(dto.PrecioUnitario.Value, 2, MidpointRounding.AwayFromZero)
                    : null,
                Observaciones = dto.Observaciones,
                FechaRegistro = DateTime.UtcNow,
                UsuarioRegistro = usuario
            };

            var created = await _repo.AddEntregableAsync(entity);
            await RecalcularMontosAsync(os);

            return ToEntregableDto(created);
        }

        public async Task<OrdenServicioPruebasEntregableResponseDto> UpdateEntregableAsync(int documentoId, int entregableId, OrdenServicioPruebasUpdateEntregableDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoFactura ?? "").ToUpperInvariant() == "CONFACTURA")
                throw new InvalidOperationException("No se pueden modificar entregables en una orden CONFACTURA.");

            var item = await _repo.GetEntregableByIdAsync(entregableId);
            if (item == null || item.OrdenServicioActividadId != os.Id)
                throw new KeyNotFoundException("Entregable no encontrado para esta orden.");

            if (dto.Cantidad <= 0)
                throw new ArgumentException("Cantidad debe ser mayor a 0.");

            item.Cantidad = Math.Round(dto.Cantidad, 2, MidpointRounding.AwayFromZero);
            item.PrecioUnitario = dto.PrecioUnitario.HasValue
                ? Math.Round(dto.PrecioUnitario.Value, 2, MidpointRounding.AwayFromZero)
                : null;
            item.Observaciones = dto.Observaciones;

            await _repo.UpdateEntregableAsync(item);
            await RecalcularMontosAsync(os);

            return ToEntregableDto(item);
        }

        public async Task<bool> DeleteEntregableAsync(int documentoId, int entregableId)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoFactura ?? "").ToUpperInvariant() == "CONFACTURA")
                throw new InvalidOperationException("No se pueden modificar entregables en una orden CONFACTURA.");

            var item = await _repo.GetEntregableByIdAsync(entregableId);
            if (item == null || item.OrdenServicioActividadId != os.Id)
                throw new KeyNotFoundException("Entregable no encontrado para esta orden.");

            var ok = await _repo.DeleteEntregableAsync(item);
            await RecalcularMontosAsync(os);
            return ok;
        }

        public async Task<OrdenServicioPruebasResponseDto> EnviarConFacturaAsync(int documentoId, OrdenServicioPruebasEnviarConFacturaDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            var estadoActual = (os.EstadoFactura ?? "PENDIENTE").Trim().ToUpperInvariant();
            if (estadoActual == "CON FACTURA") estadoActual = "CONFACTURA";
            if (estadoActual == "SIN FACTURA") estadoActual = "SIN_FACTURA";

            if (estadoActual == "CONFACTURA")
                throw new InvalidOperationException("La orden ya fue enviada a CONFACTURA.");

            var entregables = await _repo.GetEntregablesByActividadIdAsync(os.Id);
            if (entregables == null || entregables.Count == 0)
                throw new InvalidOperationException("No se puede enviar con factura sin entregables.");

            await RecalcularMontosAsync(os);

            var createDto = new OrdenServicioCreateRequestDto
            {
                ClienteId = 1, // TODO: mapear cliente real
                AgenteId = os.AgentePrincipal ?? 1,
                AgentePrincipal = os.AgentePrincipal ?? 1,
                Fecha = DateTime.Now,
                Afectado = 0,
                Neto = (int)Math.Round(os.Subtotal ?? 0m, 0, MidpointRounding.AwayFromZero),
                Impuesto = (int)Math.Round(os.Iva ?? 0m, 0, MidpointRounding.AwayFromZero),
                Impuesto1 = 0,
                Estado = back_cabs.CRM.enums.EstadoOrden.PENDIENTE,
                ObservacionesDocumento = $"[PRUEBAS] Doc origen: {documentoId}. {dto?.ObservacionesFactura}",
                Total = (int)Math.Round(os.TotalConIva ?? 0m, 0, MidpointRounding.AwayFromZero),
                FechaEntrega = DateTime.Now,
                DocumentoId = os.DocumentoId,
                EsVirtual = os.EsVirtual,
                TipoOrden = back_cabs.CRM.enums.TipoOrden.SERVICIO_TECNICO
            };

            var nuevoDocumentoId = await _ordenServicioService.CreateOrdenServicioAsync(createDto);

            os.EstadoFactura = "CONFACTURA";
            os.Observaciones = string.IsNullOrWhiteSpace(os.Observaciones)
                ? $"[FACTURA] Documento legacy creado: {nuevoDocumentoId}"
                : $"{os.Observaciones}\n[FACTURA] Documento legacy creado: {nuevoDocumentoId}";

            await _repo.UpdateAsync(os);
            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchAgentePrincipalAsync(int documentoId, OrdenServicioPruebasPatchAgentePrincipalDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoOrden ?? "").ToUpperInvariant() == "FINALIZADO")
                throw new InvalidOperationException("No se puede cambiar el agente principal en una orden FINALIZADA.");

            if (dto.IdAgentePrincipal <= 0)
                throw new ArgumentException("idAgentePrincipal debe ser mayor a 0.");

            await _admOrdenServicioRepository.UpdateAgentePrincipalAsync(documentoId, dto.IdAgentePrincipal);

            // Reflejar en la actividad para que el DTO devuelva el valor actualizado
            os.AgentePrincipal = dto.IdAgentePrincipal;
            await _repo.UpdateAsync(os);

            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchAgentesAuxiliaresAsync(int documentoId, OrdenServicioPruebasPatchAgentesAuxiliaresDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoOrden ?? "").ToUpperInvariant() == "FINALIZADO")
                throw new InvalidOperationException("No se puede cambiar los agentes auxiliares en una orden FINALIZADA.");

            os.AgenteAuxiliar = dto.AgentesAuxiliares != null && dto.AgentesAuxiliares.Count > 0
                ? string.Join(",", dto.AgentesAuxiliares)
                : null;

            await _repo.UpdateAsync(os);
            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchObservacionesAsync(int documentoId, OrdenServicioPruebasPatchObservacionesDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoOrden ?? "").ToUpperInvariant() == "FINALIZADO")
                throw new InvalidOperationException("No se pueden modificar las observaciones en una orden FINALIZADA.");

            await _admOrdenServicioRepository.UpdateObservacionesDocumentoAsync(documentoId, dto.Observaciones);
            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchNotaSoporteAsync(int documentoId, OrdenServicioPruebasPatchNotaSoporteDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoOrden ?? "").ToUpperInvariant() != "EN_PROCESO")
                throw new InvalidOperationException("La nota de soporte solo se puede actualizar cuando la orden está EN_PROCESO.");

            os.NotasSoporte = dto.NotaSoporte;
            await _repo.UpdateAsync(os);
            return ToDto(os);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchDireccionAsync(int documentoId, OrdenServicioPruebasPatchDireccionDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            var direccion = (dto.DireccionGoogleMaps ?? "").Trim();
            if (string.IsNullOrWhiteSpace(direccion))
                throw new ArgumentException("direccionGoogleMaps no puede estar vacío.");

            if (dto.Latitud == null || dto.Latitud < -90 || dto.Latitud > 90)
                throw new ArgumentException("latitud inválida. Debe estar entre -90 y 90.");

            if (dto.Longitud == null || dto.Longitud < -180 || dto.Longitud > 180)
                throw new ArgumentException("longitud inválida. Debe estar entre -180 y 180.");

            os.DireccionGoogleMaps = direccion;
            os.Latitud = dto.Latitud;
            os.Longitud = dto.Longitud;

            await _repo.UpdateAsync(os);

            var documentos = await _admOrdenServicioRepository.GetDocumentosByIdsAsync([documentoId]);
            var documento = documentos.FirstOrDefault();
            return ToDto(os, documento);
        }

        public async Task<OrdenServicioPruebasResponseDto> PatchClienteAsync(int documentoId, OrdenServicioPruebasPatchClienteDto dto)
        {
            var os = await _repo.GetByDocumentoIdAsync(documentoId);
            if (os == null) throw new KeyNotFoundException("Orden no encontrada.");

            if ((os.EstadoOrden ?? "").ToUpperInvariant() == "FINALIZADO")
                throw new InvalidOperationException("No se puede cambiar el cliente en una orden FINALIZADA.");

            if (dto.IdCliente <= 0)
                throw new ArgumentException("idCliente debe ser mayor a 0.");

            await _admOrdenServicioRepository.UpdateClienteAsync(documentoId, dto.IdCliente);

            var documentos = await _admOrdenServicioRepository.GetDocumentosByIdsAsync([documentoId]);
            var documento = documentos.FirstOrDefault();
            return ToDto(os, documento);
        }

        private async Task RecalcularMontosAsync(OrdenServicioActividad os)
        {
            var items = await _repo.GetEntregablesByActividadIdAsync(os.Id);
            var subtotal = items.Sum(x => x.Cantidad * (x.PrecioUnitario ?? 0m));

            os.Subtotal = Math.Round(subtotal, 2, MidpointRounding.AwayFromZero);
            os.TotalConIva = Math.Round(os.Subtotal.Value * 1.16m, 2, MidpointRounding.AwayFromZero);
            os.Iva = Math.Round(os.TotalConIva.Value - os.Subtotal.Value, 2, MidpointRounding.AwayFromZero);

            await _repo.UpdateAsync(os);
        }

        private static OrdenServicioPruebasEntregableResponseDto ToEntregableDto(OrdenServicioEntregable x) => new()
        {
            Id = x.Id,
            OrdenServicioActividadId = x.OrdenServicioActividadId,
            Tipo = x.Tipo,
            CodigoProducto = x.CodigoProducto,
            NombreProducto = x.NombreProducto,
            Cantidad = x.Cantidad,
            PrecioUnitario = x.PrecioUnitario,
            Importe = Math.Round(x.Cantidad * (x.PrecioUnitario ?? 0m), 2, MidpointRounding.AwayFromZero),
            Observaciones = x.Observaciones,
            FechaRegistro = x.FechaRegistro,
            UsuarioRegistro = x.UsuarioRegistro
        };

        private static OrdenServicioPruebasResponseDto ToDto(OrdenServicioActividad x, AdmDocumento? documento = null) => new()
        {
            Id = x.Id,
            DocumentoId = x.DocumentoId,
            Folio = $"ORD-{x.DocumentoId:D6}",
            EsVirtual = x.EsVirtual,
            FechaCreacion = x.FechaCreacion,
            FechaInicio = x.FechaInicio,
            FechaFinalizacion = x.FechaFinal,
            TotalHoras = x.TotalHoras,
            AgentePrincipal = x.AgentePrincipal,
            IdAgentePrincipal = documento?.CIdAgente ?? x.AgentePrincipal,
            AgenteAuxiliar = x.AgenteAuxiliar,
            TituloEvento = x.TituloEvento,
            FechaStart = x.FechaStart,
            FechaEnd = x.FechaEnd,
            NombreSolicitante = x.NombreSolicitante,
            NombreDestinatario = x.NombreDestinatario,
            ContactoSolicitante = x.ContactoSolicitante,
            ContactoDestinatario = x.ContactoDestinatario,
            UrlImagen = x.UrlImagen,
            CredencialesEscritas = x.CredencialesEscritas,
            EstadoOrden = x.EstadoOrden ?? "PENDIENTE",
            EstadoFactura = x.EstadoFactura ?? "PENDIENTE",
            DireccionGoogleMaps = x.DireccionGoogleMaps,
            GooglePlaceId = x.GooglePlaceId,
            Latitud = x.Latitud,
            Longitud = x.Longitud,
            Subtotal = x.Subtotal,
            Iva = x.Iva,
            TotalConIva = x.TotalConIva,
            Total = documento != null ? (decimal)documento.CTotal : x.TotalConIva,
            Observaciones = x.Observaciones,
            ObservacionesDocumento = documento?.CObservaciones,
            NotasSoporte = x.NotasSoporte,
            IdCliente = documento?.CIdClienteProveedor
        };

        private static DateTime? ParseDate(string? value, string fieldName, bool endOfDay)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (!DateTime.TryParseExact(value.Trim(), "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                throw new ArgumentException($"{fieldName} debe tener el formato dd/MM/yyyy.");
            }

            return endOfDay
                ? parsed.Date.AddDays(1).AddTicks(-1)
                : parsed.Date;
        }

        private static string NormalizeEstadoFactura(string? estadoFactura)
        {
            var estadoNormalizado = (estadoFactura ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(estadoNormalizado))
                estadoNormalizado = "PENDIENTE";

            if (estadoNormalizado == "CON FACTURA") estadoNormalizado = "CONFACTURA";
            if (estadoNormalizado == "SIN FACTURA") estadoNormalizado = "SIN_FACTURA";

            var permitidosFactura = new[] { "PENDIENTE", "CONFACTURA", "SIN_FACTURA" };
            if (!permitidosFactura.Contains(estadoNormalizado))
                throw new ArgumentException("EstadoFactura inválido. Usa: PENDIENTE, CONFACTURA o SIN_FACTURA.");

            return estadoNormalizado;
        }

        /// <summary>
        /// Calcula horas laborales entre dos fechas:
        /// Lunes–Viernes: 09:00–18:00 | Sábado: 09:00–14:00 | Domingo: 0 horas
        /// </summary>
        private static decimal CalculateBusinessHours(DateTime start, DateTime end)
        {
            if (end <= start) return 0m;

            decimal totalMinutes = 0;
            var current = start.Date;

            while (current < end.Date.AddDays(1))
            {
                var dow = current.DayOfWeek;

                if (dow != DayOfWeek.Sunday)
                {
                    var workStart = current.AddHours(9);
                    var workEnd = dow == DayOfWeek.Saturday
                        ? current.AddHours(14)
                        : current.AddHours(18);

                    var segmentStart = start > workStart ? start : workStart;
                    var segmentEnd = end < workEnd ? end : workEnd;

                    if (segmentEnd > segmentStart)
                        totalMinutes += (decimal)(segmentEnd - segmentStart).TotalMinutes;
                }

                current = current.AddDays(1);
            }

            return Math.Round(totalMinutes / 60m, 2, MidpointRounding.AwayFromZero);
        }

        private static string Truncate(string value, int maxLength)
            => value.Length <= maxLength ? value : value[..maxLength];

        
    }
}