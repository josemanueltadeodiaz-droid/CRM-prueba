
using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.DTOs.ServiceResponse;
using CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Legacy;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.enums;
using back_cabs.CRM.Interfaces.Legacy;
using IAdmDocumentoRepository = back_cabs.CRM.Interfaces.Legacy.IAdmDocumentoRepository;
using back_cabs.CRM.models.legacy;
using back_cabs.CRM.models.Soporte;
using back_cabs.CRM.services.Fleet;
using back_cabs.CRM.Repositories.Soporte;

namespace back_cabs.CRM.services.Soporte
{
    /// <summary>
    /// Servicio que maneja la lógica de negocio para Órdenes de Servicio
    /// Implementa operaciones CRUD para las tres modalidades:
    /// - Reparación
    /// - Capacitación
    /// - Servicio Técnico
    /// </summary>
    public class OrdenServicioService : IOrdenServicioService
    {
        private readonly IAdmDocumentoRepository _documentoRepository;
        private readonly IAdmClienteRepository _clienteRepository;
        private readonly IAdmAgenteRepository _agenteRepository;
        private readonly IActividadRepository _actividadRepository;
        private readonly IAdmOrdenServicioRepository _ordenServicioRepository;
        private readonly back_cabs.CRM.Interfaces.Shared.IUsoVehiculoRepository _usoVehiculoRepository;
        private readonly back_cabs.CRM.Core.UnitOfWork.IUnitOfWork _unitOfWork;
        private readonly ILogger<OrdenServicioService> _logger;
        private readonly VehiculosService _vehiculosService;
        private const int PRODUCTO_SERVICIO_ID = 393;        // Valor constante para el producto de servicio
        private const int ALMACEN_DEFAULT_ID = 1;           // Valor constante para el almacén por defecto


        public OrdenServicioService(
            IAdmDocumentoRepository documentoRepository,
            IAdmClienteRepository clienteRepository,
            IAdmAgenteRepository agenteRepository,
            IActividadRepository actividadRepository,
            IAdmOrdenServicioRepository ordenServicioRepository,
            back_cabs.CRM.Interfaces.Shared.IUsoVehiculoRepository usoVehiculoRepository,
            back_cabs.CRM.Core.UnitOfWork.IUnitOfWork unitOfWork,
            ILogger<OrdenServicioService> logger,
            VehiculosService vehiculosService)
        {
            _documentoRepository = documentoRepository;
            _clienteRepository = clienteRepository;
            _agenteRepository = agenteRepository;
            _actividadRepository = actividadRepository;
            _ordenServicioRepository = ordenServicioRepository;
            _usoVehiculoRepository = usoVehiculoRepository;
            _unitOfWork = unitOfWork;
            _logger = logger;
            _vehiculosService = vehiculosService;
        }

        #region Metodos Generales de Orden de Servicio
public async Task<int> CreateOrdenServicioAsync(OrdenServicioCreateRequestDto dto)
{
    // ESTRATEGIA: Escritura Secuencial (Dual-Write) sin Transacción Distribuida (DTC)
    // 1. Escribir en Legacy
    // 2. Escribir en Actividad
    // Motivo: Evitar requerimiento de MSDTC entre instancias/contextos distintos.

    // Validaciones
    var Cliente = await _clienteRepository.GetByIdWithDomicilioAsync(dto.ClienteId);
    if (Cliente == null)
    {
        throw new Exception("Cliente no encontrado, favor de verificar que el cliente exista");
    }

    var Agente = await _agenteRepository.GetByIdAsync(dto.AgenteId);
    if (Agente == null)
    {
        throw new Exception("Agente no encontrado, favor de verificar que el agente exista");
    }

    _logger.LogInformation("Iniciando creación de Orden de Servicio (Secuencial)");

    // Defaults para campos opcionales
    var fechaEntrega = dto.FechaEntrega ?? dto.Fecha;
    var softwareRemoto = dto.SoftwareControlRemoto ?? (TipoSoftware)0;

    // Regla: el frontend manda "total" como SUBTOTAL sin IVA
    decimal subtotal = dto.Total ?? 0m;
    decimal totalConIVA = subtotal * 1.16m;
    decimal iva = totalConIVA - subtotal;

    int idDocumento = 0;

    try
    {
        // -----------------------------------------------------------------------
        // PASO 1: Crear Documento Legacy (AdmDocumento)
        // -----------------------------------------------------------------------
        var nuevoDocumento = new AdmDocumento
        {
            CIdDocumentoDe = 2,
            CIdConceptoDocumento = 3003,
            CSerieDocumento = "OS",
            CFecha = DateTime.Now,
            CIdClienteProveedor = dto.ClienteId,
            CRazonSocial = Cliente.CRazonSocial,
            CRfc = Cliente.CRfc,
            CIdAgente = dto.AgenteId,
            CFechaVencimiento = fechaEntrega,
            CFechaProntoPago = fechaEntrega,
            CFechaEntregaRecepcion = fechaEntrega,
            CFechaUltimoInteres = fechaEntrega,
            CFechaExtra = new DateTime(1900, 1, 1),
            CIdMoneda = 1, // MXN por defecto
            CTipoCambio = 1,
            CReferencia = $"OS-{DateTime.Now:yyyy/MM/dd}",
            CObservaciones = dto.ObservacionesDocumento,
            CNaturaleza = 0,
            CIdDocumentoOrigen = 0,
            CPlantilla = 0,
            CUsaCliente = 1,
            CUsaProveedor = 0,
            CAfectado = dto.Afectado,
            CImpreso = dto.Impreso ?? 0,
            CCancelado = dto.Cancelado ?? 0,
            CDevuelto = 0,

            // Totales OS
            CNeto = (double)subtotal,
            CImpuesto1 = (double)iva,
            CPorcentajeImpuesto1 = 16,
            CImpuesto2 = 0,
            CImpuesto3 = 0,
            CTotal = (double)totalConIVA,
            CPendiente = (double)totalConIVA,

            CIdPrepoliza = 0,
            CIdPrepolizaCancelacion = 0,
            CEstadoContable = 0,
            CTimestamp = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss:fff"),
            CUsuario = "SISTEMA",
            CTextoExtra1 = dto.Estado.ToString(),
            CTextoExtra2 = "",
            CTextoExtra3 = "",
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

        // Insertar en Legacy
        idDocumento = await _documentoRepository.CreateDocumentoOrdenServicioAsync(nuevoDocumento);
        _logger.LogInformation("Documento Legacy AdmDocumento creado con ID: {IdDocumento}", idDocumento);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error CRÍTICO al crear el documento Legacy. No se continuará con la actividad.");
        throw;
    }

    try
    {
        // Validar existencia de documento
        var documento = await _documentoRepository.GetByIdAsync(idDocumento);
        if (documento == null)
        {
            throw new Exception("Documento no encontrado, favor de verificar que el documento exista");
        }

        // -----------------------------------------------------------------------
        // PASO 2: Crear Actividad Local
        // -----------------------------------------------------------------------
        var nuevaActividad = new Actividad
        {
            DocumentoId = idDocumento, // VINCULACIÓN CRÍTICA
            Participantes = dto.Participantes,
            EsVirtual = dto.EsVirtual,
            Horas = dto.Horas,
            InfDispositivo = dto.InfDispositivo,
            Piezas = dto.Piezas,
            Ubicacion = dto.Ubicacion,
            AgentePrincipal = dto.AgentePrincipal,
            Agentes = dto.AgentesIds != null && dto.AgentesIds.Any()
                ? System.Text.Json.JsonSerializer.Serialize(dto.AgentesIds)
                : null,
            SoftwareControlRemoto = softwareRemoto,
            FechaCreacion = DateTime.UtcNow,
            TipoOrden = dto.TipoOrden,

            // Montos en actividad (para no depender solo de legacy)
            Subtotal = subtotal,
            Iva = iva,
            TotalConIva = totalConIVA
        };

        await _actividadRepository.CreateAsync(nuevaActividad);
        _logger.LogInformation("Actividad creada y vinculada al Documento ID: {IdDocumento}", idDocumento);

        return idDocumento;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error al crear la Actividad. Documento {IdDocumento} huérfano.", idDocumento);
        try
        {
            await _documentoRepository.CancelarDocumentoAsync(idDocumento, "Fallo de creacion de OS", "SISTEMA");
            await _documentoRepository.DeleteDocumentoAsync(idDocumento);
            _logger.LogInformation("Rollback exitoso del Documento ID: {IdDocumento}", idDocumento);
        }
        catch (Exception rollbackEx)
        {
            _logger.LogCritical(rollbackEx, "ROLLBACK FALLIDO. Documento ID: {IdDocumento} requiere limpieza manual.", idDocumento);
        }

        throw new Exception($"La orden (ID {idDocumento}) falló al guardar los detalles de servicio.", ex);
    }
}        public async Task UpdateOrdenServicioAsync(int idDocumento, OrdenServicioFinRequestDto dto)
        {
            // -----------------------------------------------------------------------
            // VALIDACIONES PREVIAS
            // -----------------------------------------------------------------------
            var documento = await _documentoRepository.GetByIdAsync(idDocumento);
            if (documento == null)
                throw new Exception($"Orden de Servicio con ID {idDocumento} no encontrada.");

            // Bloquear edición si está cancelada o cerrada
            // CTextoExtra1 almacena el estado de la OS (según tu modelo de creación)
            var estadosNoEditables = new[] { "Cancelada", "Cerrada" };
            if (estadosNoEditables.Contains(documento.CTextoExtra1, StringComparer.OrdinalIgnoreCase))
            {

            }

            var cliente = await _clienteRepository.GetByIdWithDomicilioAsync(documento.CIdClienteProveedor);
            if (cliente == null)
                throw new Exception("Cliente no encontrado, favor de verificar que el cliente exista.");

            _logger.LogInformation("Iniciando actualización de Orden de Servicio ID: {IdDocumento} (Secuencial)", idDocumento);

            // Recalculo de totales (misma lógica que en creación)
            decimal totalSinIVA = dto.Neto + dto.Impuesto + dto.Impuesto1;
            decimal iva = totalSinIVA * 0.16m;
            decimal totalConIVA = totalSinIVA * 1.16m;

            // -----------------------------------------------------------------------
            // PASO 1: Actualizar Documento Legacy (AdmDocumento)
            // -----------------------------------------------------------------------
            try
            {
                documento.CIdClienteProveedor = cliente.CIdClienteProveedor;
                documento.CRazonSocial = cliente.CRazonSocial;
                documento.CRfc = cliente.CRfc;
                documento.CIdAgente = documento.CIdAgente;
                documento.CFechaVencimiento = documento.CFechaVencimiento;
                documento.CFechaProntoPago = documento.CFechaProntoPago;
                documento.CFechaEntregaRecepcion = documento.CFechaEntregaRecepcion;
                documento.CFechaUltimoInteres = documento.CFechaUltimoInteres;
                documento.CObservaciones = documento.CObservaciones;
                documento.CAfectado = documento.CAfectado;
                documento.CImpreso = documento.CImpreso;
                documento.CCancelado = documento.CCancelado;
                documento.CNeto = (double)totalSinIVA;
                documento.CImpuesto1 = (double)iva;
                documento.CPorcentajeImpuesto1 = 16;
                documento.CImpuesto2 = dto.Impuesto;
                documento.CImpuesto3 = dto.Impuesto1;
                documento.CTotal = (double)totalConIVA;
                documento.CPendiente = (double)totalConIVA;
                documento.CTextoExtra1 = dto.Estado.ToString();
                documento.CTextoExtra2 = dto.ObservacionesFinales ?? documento.CTextoExtra2;
                documento.CTimestamp = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss:fff");
                documento.CUsuario = "SISTEMA";

                await _documentoRepository.UpdateAsync(documento);
                _logger.LogInformation("Documento Legacy AdmDocumento actualizado. ID: {IdDocumento}", idDocumento);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error CRÍTICO al actualizar el documento Legacy ID: {IdDocumento}. No se continuará con la actividad.", idDocumento);
                throw;
            }

            // -----------------------------------------------------------------------
            // PASO 2: Actualizar Actividad vinculada
            // -----------------------------------------------------------------------
            try
            {
                var actividad = await _actividadRepository.GetByDocumentoIdAsync(idDocumento);
                if (actividad == null)
                {
                    // Caso borde: el documento existe pero quedó huérfano (fallo previo en creación)
                    // Se re-crea la actividad en lugar de fallar
                    _logger.LogWarning("Actividad no encontrada para Documento ID: {IdDocumento}. Se creará una nueva actividad.", idDocumento);

                    var nuevaActividad = new Actividad
                    {
                        DocumentoId = idDocumento,
                        Participantes = actividad?.Participantes,
                        EsVirtual = actividad.EsVirtual,
                        Horas = actividad?.Horas,
                        InfDispositivo = actividad?.InfDispositivo,
                        Piezas = actividad?.Piezas,
                        Ubicacion = actividad?.Ubicacion,
                        AgentePrincipal = actividad?.AgentePrincipal,
                        Agentes = actividad?.Agentes,
                        SoftwareControlRemoto = actividad.SoftwareControlRemoto,
                        FechaCreacion = actividad.FechaCreacion,
                        TipoOrden = actividad.TipoOrden
                    };

                    await _actividadRepository.CreateAsync(nuevaActividad);
                    _logger.LogInformation("Actividad re-creada y vinculada al Documento ID: {IdDocumento}", idDocumento);
                }
                else
                {
                    actividad.Participantes = actividad.Participantes;
                    actividad.EsVirtual = actividad.EsVirtual;
                    actividad.Horas = actividad.Horas;
                    actividad.InfDispositivo = actividad.InfDispositivo;
                    actividad.Piezas = actividad.Piezas;
                    actividad.Ubicacion = actividad.Ubicacion;
                    actividad.AgentePrincipal = actividad.AgentePrincipal;
                    actividad.Agentes = actividad.Agentes;
                    actividad.SoftwareControlRemoto = actividad.SoftwareControlRemoto;
                    actividad.TipoOrden = actividad.TipoOrden;
                    // FechaCreacion no se toca — es inmutable una vez creada

                    await _actividadRepository.UpdateAsync(actividad);
                    _logger.LogInformation("Actividad actualizada para Documento ID: {IdDocumento}", idDocumento);
                }

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar la Actividad del Documento ID: {IdDocumento}. El documento Legacy YA FUE ACTUALIZADO pero la actividad quedó desincronizada.", idDocumento);
                throw new Exception($"La OS (ID {idDocumento}) fue actualizada en el sistema legacy pero falló al guardar los detalles de servicio.", ex);
            }
        }
        public async Task<OrdenServicioResponseDto?> GetOrdenServicioByIdAsync(int id)
        {
            var documento = await _documentoRepository.GetByIdAsync(id);
            if (documento == null) return null;

            var servicio = await MapToOrdenServicioResponseDto(documento);
            servicio.Detalles = await _ordenServicioRepository.GetServicioByDocumentoIdAsync(id);
            return servicio;
        }

        #endregion

        #region Metodos para los servicios

        public async Task<ServiceResult> AgregarServiciosAsync(OrdenServicioAgregarServiciosDto dto)
        {
            // VALIDACIONES
            if (!dto.Servicios.Any())
                return ServiceResult.Fail("Debe incluir al menos un servicio.");

            var doc = await _documentoRepository.GetByIdAsync(dto.DocumentoId);
            if (doc == null)
                return ServiceResult.Fail($"No se encontró la OS con ID {dto.DocumentoId}.");

            var estadosNoEditables = new[] { EstadoOrden.CERRADA.ToString(), EstadoOrden.CANCELADA.ToString() };
            if (estadosNoEditables.Contains(doc.CTextoExtra1, StringComparer.OrdinalIgnoreCase))
                return ServiceResult.Fail($"La OS con ID {dto.DocumentoId} no puede modificarse porque está {doc.CTextoExtra1}.");

            _logger.LogInformation("Iniciando inserción de servicios para Documento ID: {IdDocumento}", dto.DocumentoId);

            // int en lugar de double — es un contador, no un decimal
            // Se mueve aquí, después de las validaciones — no tiene sentido consultarlo si la OS no es válida
            double ultimoNumero = await _ordenServicioRepository.GetUltimoNumeroMovimientoAsync(dto.DocumentoId);
            _logger.LogInformation("Último número de movimiento para Documento ID {DocumentoId}: {NumeroMovimiento}",
                dto.DocumentoId, ultimoNumero);

            // Construir movimientos
            var movimientosAInsertar = dto.Servicios
                .Select((servicio) => new AdmMovimiento
                {
                    CIdProducto = PRODUCTO_SERVICIO_ID,
                    CIdAlmacen = ALMACEN_DEFAULT_ID,
                    CNumeroMovimiento = ++ultimoNumero,
                    CIdUnidad = 1,
                    CIdUnidadNc = 1,
                    CUnidades = 1,
                    CUnidadesNc = 1,
                    CUnidadesCapturadas = 1,
                    CUnidadesPendientes = 1,
                    CUnidadesNcPendientes = 1,
                    CUnidadesOrigen = 0,
                    CUnidadesNcOrigen = 0,
                    CPrecio = 0,
                    CPrecioCapturado = 0,
                    CCostoCapturado = 0,
                    CCostoEspecifico = 0,
                    CNeto = 0,
                    CTotal = 0,
                    CImpuesto1 = 0,
                    CPorcentajeImpuesto1 = 0,
                    CImpuesto2 = 0,
                    CPorcentajeImpuesto2 = 0,
                    CImpuesto3 = 0,
                    CPorcentajeImpuesto3 = 0,
                    CRetencion1 = 0,
                    CPorcentajeRetencion1 = 0,
                    CRetencion2 = 0,
                    CPorcentajeRetencion2 = 0,
                    CDescuento1 = 0,
                    CPorcentajeDescuento1 = 0,
                    CDescuento2 = 0,
                    CPorcentajeDescuento2 = 0,
                    CDescuento3 = 0,
                    CPorcentajeDescuento3 = 0,
                    CDescuento4 = 0,
                    CPorcentajeDescuento4 = 0,
                    CDescuento5 = 0,
                    CPorcentajeDescuento5 = 0,
                    CPorcentajeComision = 0,
                    CObservaMov = servicio.Observaciones ?? "",
                    CAfectaExistencia = 0,
                    CAfectadoSaldos = 0,
                    CAfectadoInventario = 0,
                    CFecha = DateTime.Now,
                    CFechaExtra = DateTime.Now,
                    CReferencia = "",
                    CMovtoOculto = 0,
                    CIdMovtoOwner = 0,
                    CIdMovtoOrigen = 0,
                    CIdMovtoDestino = 0,
                    CTipoTraspaso = 0,
                    CIdValorClasificacion = 0,
                    CNumeroConsolidaciones = 0,
                    CImporteExtra1 = 0,
                    CImporteExtra2 = 0,
                    CImporteExtra3 = 0,
                    CImporteExtra4 = 0,
                    CTextoExtra1 = "",
                    CTextoExtra2 = "",
                    CTextoExtra3 = "",
                    CTimestamp = "",
                    CGtoMovto = 0,
                    CScMovto = "",
                    CComVenta = 0,
                    CObjImpu01 = ""
                })
                .ToList();

            await _documentoRepository.InsertarServiciosAsync(
                dto.DocumentoId,
                doc.CIdDocumentoDe,
                movimientosAInsertar
            );

            _logger.LogInformation("{Cantidad} servicios insertados para Documento ID: {IdDocumento}",
                movimientosAInsertar.Count, dto.DocumentoId);

            return ServiceResult.Ok("Servicios insertados correctamente.");
        }

        public async Task<(List<OrdenServicioResponseDto> ordenes, int totalRegistros)> GetOrdenesServicioAsync(AdmDocumentoFilterDto filter)
        {
            filter.IdConcepto = 3003;

            var (documentos, total) = await _documentoRepository.SearchPaginatedAsync(filter);

            if (!documentos.Any())
                return ([], total);

            var ordenes = new List<OrdenServicioResponseDto>();
            foreach (var doc in documentos)
            {
                var orden = await MapToOrdenServicioResponseDto(doc);

                // Una query por documento — aceptable dado que es una lista paginada
                orden.Detalles = await _documentoRepository.GetServicioByDocumentoIdAsync(doc.CIdDocumento);
                ordenes.Add(orden);
            }

            return (ordenes, total);
        }

        //Metodo para editar un servicio
        public async Task<ServiceResult> EditarServicioAsync(OrdenServicioMovimientoDto dto)
        {
            //Obtener el Servicio a editar
            var servicio = await _ordenServicioRepository.GetMovimientoByIdAsync(dto.IdMovimiento);
            if (servicio == null) return ServiceResult.Fail("Servicio no encontrado.");
            var estado = await _ordenServicioRepository.OrdenCerradaAsync(servicio.CIdDocumento);
            if (estado) return ServiceResult.Fail("La orden esta cerrada.");

            await _ordenServicioRepository.ActualizarObservacionesMovimientoAsync(dto.IdMovimiento, dto.Observaciones);

            return ServiceResult.Ok("Servicio actualizado correctamente.");
        }
        #endregion

        #region Metodos Auxiliares

        //Metodo para traer todos los numeros de movimiento de una orden de servicio
        public async Task<double> GetUltimoNumeroMovimientoAsync(int documentoId)
        {
            var movimientos = await _ordenServicioRepository.GetUltimoNumeroMovimientoAsync(documentoId);
            return movimientos;
        }

        public async Task<OrdenServicioResponseDto?> IniciarOrdenServicioAsync(OrdenServicioInicioRequestDto dto)
        {
            // 1. Obtener la actividad vinculada al documento
            var actividad = await _actividadRepository.GetByDocumentoIdAsync(dto.DocumentoId);
            if (actividad == null) return null;

            // 2. Lógica de Vehículo (Si aplica)
            if (dto.UsaVehiculo == true && dto.VehiculoId.HasValue)
            {
                var salidaDto = new RegistrarSalidaDto
                {
                    // Si tienes el ID de usuario disponible, asígnalo aquí. 
                    // Si lo dejas nulo, el servicio intentará tomarlo de la sesión.
                    UsuarioId = 1,
                    MotivoUso = $"Orden de Servicio {dto.DocumentoId}",
                    KilometrajeInicial = dto.KmInicial.HasValue ? (int)dto.KmInicial.Value : 0,
                    FechaSalida = dto.HoraInicio
                };

                // Usamos el servicio que valida disponibilidad, unicidad y transacciones
                await _vehiculosService.RegistrarSalidaAsync(dto.VehiculoId.Value, salidaDto);
            }

            // 3. Registrar hora en la actividad + Datos Vehículo
            await _actividadRepository.RegistrarHoraInicioAsync(actividad.Id, dto.HoraInicio, dto.UsaVehiculo, dto.VehiculoId);

            // 4. Actualizar Estado en AdmDocumento
            var doc = await _documentoRepository.GetByIdAsync(dto.DocumentoId);
            if (doc != null)
            {
                // Actualizar estado a EN_CURSO (o custom logic)
                doc.CTextoExtra1 = EstadoOrden.EN_PROCESO.ToString();
                await _documentoRepository.UpdateAsync(doc);
            }

            // 5. Retornar DTO
            return await GetOrdenServicioByIdAsync(dto.DocumentoId);
        }


        public async Task<ServiceResult> FinalizarOrdenServicioAsync(OrdenServicioFinRequestDto dto)
        {
            //Calculo de subtotales
            double subtotal = dto.Neto;
            double iva = subtotal * 0.16;
            double gasto1 = dto.Impuesto;
            double gasto2 = dto.Impuesto1;
            double total = subtotal + iva + gasto1 + gasto2;

            // 1. Obtener la actividad vinculada al documento
            var actividad = await _actividadRepository.GetByDocumentoIdAsync(dto.DocumentoId);
            if (actividad == null) return null;

            // 2. Lógica de Vehículo (Cerrar uso si existe)
            if (actividad.UsaVehiculo == true)
            {
                // VALIDACIÓN: El servicio de vehículos requiere Kilometraje Final.
                if (!dto.KmFinal.HasValue)
                {
                    throw new InvalidOperationException("Para finalizar una orden con vehículo asignado, es obligatorio registrar el kilometraje final.");
                }

                var entradaDto = new RegistrarEntradaDto
                {
                    KilometrajeFinal = (int)dto.KmFinal.Value,
                    FechaRegreso = dto.HoraFin,
                    Observaciones = $" Cierre de Orden de Servicio {dto.DocumentoId}",
                    Estado = "COMPLETADO"
                };

                await _vehiculosService.RegistrarEntradaAsync(actividad.VehiculoId.Value, entradaDto);
            }

            // 3. Registrar hora fin + Datos Cierre
            await _actividadRepository.RegistrarHoraFinAsync(actividad.Id, dto.HoraFin);

            //3.5  Añadir los servicios

            // 4. Actualizar Estado, Observaciones y Costos en AdmDocumento
            var doc = await _documentoRepository.GetByIdAsync(dto.DocumentoId);
            //Verificar si esta asignada o en curso
            if (doc.CTextoExtra1 == EstadoOrden.CERRADA.ToString())
            {
                return ServiceResult.Fail("La Orden de Servicio ya esta cerrada");
            }
            if (doc != null)
            {
                doc.CTextoExtra1 = EstadoOrden.CERRADA.ToString();
                // Calcular y actualizar FechaEntregaReal si es necesario
                doc.CTextoExtra2 = dto.ObservacionesFinales ?? doc.CTextoExtra2;
                doc.CNeto = subtotal;
                doc.CTotal = total;
                doc.CImpuesto1 = iva;
                doc.CPorcentajeImpuesto1 = 16;
                doc.CPendiente = total;


                await _documentoRepository.UpdateAsync(doc);
            }

            // 5. Retornar DTO
            return ServiceResult<OrdenServicioResponseDto>.Ok(await GetOrdenServicioByIdAsync(dto.DocumentoId));
        }

        //Metodo para asignar un agente nuevo
        public async Task<ServiceResult> AssignNewAgentAsync(int OrdenServicioId, int NewAgentId)
        {
            try
            {
                //1. Validar que la orden exista junto al agente y la actividad
                var orden = await _documentoRepository.GetByIdAsync(OrdenServicioId);
                if (orden == null)
                {
                    _logger.LogWarning("La orden no Existe, Verificar que el id sea correcto");
                    return ServiceResult.Fail("La orden no Existe, Verificar que el id sea correcto");
                }

                var actividad = await _actividadRepository.GetByDocumentoIdAsync(OrdenServicioId);
                if (actividad == null)
                {
                    _logger.LogWarning("La actividad no Existe, Verificar que el id sea correcto");
                    return ServiceResult.Fail("La actividad no Existe, Verificar que el id sea correcto");
                }

                //2. Validar que el nuevo agente exista y la orden no esta cerrada
                var agente = await _agenteRepository.GetByIdAsync(NewAgentId);
                if (agente == null)
                {
                    _logger.LogWarning("El agente no Existe, Verificar que el id sea correcto");
                    return ServiceResult.Fail("El agente no Existe, Verificar que el id sea correcto");
                }
                if (orden.CTextoExtra1 == EstadoOrden.CERRADA.ToString())
                {
                    _logger.LogWarning("La orden de servicio ya esta cerrada");
                    return ServiceResult.Fail("La orden de servicio ya esta cerrada");
                }

                //4 Actualizar el Agente
                actividad.AgentePrincipal = NewAgentId;
                var Success = await _actividadRepository.UpdateAsync(actividad);
                if (Success) return ServiceResult.Ok("Agente actualizado exitosamente");
                else return ServiceResult.Fail("No se pudo actualizar el agente");
            }
            catch (Exception ex)
            {
                return ServiceResult.Fail("Error al asignar agente", ex.Message);
            }
        }
        #endregion

        #region Mapeadores
private async Task<OrdenServicioResponseDto> MapToOrdenServicioResponseDto(AdmDocumento doc)
{
    var actividad = await _actividadRepository.GetByDocumentoIdAsync(doc.CIdDocumento);

    var dto = new OrdenServicioResponseDto
    {
        IdDocumento = doc.CIdDocumento,
        IdCliente = doc.CIdClienteProveedor,
        IdAgente = doc.CIdAgente,
        SerieDocumento = doc.CSerieDocumento,
        Folio = doc.CFolio,
        Fecha = doc.CFecha,
        RazonSocial = doc.CRazonSocial,
        FechaVencimiento = doc.CFechaVencimiento,
        FechaProntoPago = doc.CFechaProntoPago,
        FechaEntregaRecepcion = doc.CFechaEntregaRecepcion,

        // Base legacy (fallback)
        Subtotal = doc.CNeto,
        IVA = doc.CImpuesto1,
        Gasto1 = doc.CImpuesto2,
        Gasto2 = doc.CImpuesto3,
        Total = doc.CTotal,

        Estado = !string.IsNullOrEmpty(doc.CTextoExtra1) ? doc.CTextoExtra1 : "Activa",
        Afectado = doc.CAfectado == 1 ? "Si" : "No",
        Impreso = doc.CImpreso == 1 ? "Si" : "No",
        Devuelto = doc.CDevuelto == 1 ? "Si" : "No",

        Observaciones = doc.CObservaciones,
        Facturado = false,
        Detalles = []
    };

    if (actividad != null)
    {
        dto.Agente = actividad.AgentePrincipal;
        dto.Participantes = actividad.Participantes;
        dto.EsVirtual = actividad.EsVirtual;
        dto.Horas = actividad.Horas;
        dto.InfDispositivo = actividad.InfDispositivo;
        dto.Piezas = actividad.Piezas;
        dto.Ubicacion = actividad.Ubicacion;
        dto.TipoOrden = actividad.TipoOrden;
        dto.SoftwareControlRemoto = actividad.SoftwareControlRemoto;

        // Priorizar montos guardados en Actividad
        dto.Subtotal = (double)(actividad.Subtotal ?? (decimal)doc.CNeto);
        dto.IVA = (double)(actividad.Iva ?? (decimal)doc.CImpuesto1);
        dto.Total = (double)(actividad.TotalConIva ?? (decimal)doc.CTotal);

        if (!string.IsNullOrEmpty(actividad.Agentes))
        {
            try
            {
                dto.AgentesIds = System.Text.Json.JsonSerializer.Deserialize<List<int>>(actividad.Agentes);
            }
            catch
            {
                dto.AgentesIds = null;
            }
        }
    }

    return dto;
}
        #endregion

    }
}
