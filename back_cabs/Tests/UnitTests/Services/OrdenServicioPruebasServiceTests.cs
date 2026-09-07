using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.Interfaces.Legacy;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.models.legacy;
using back_cabs.CRM.models.Soporte;
using back_cabs.CRM.services.Soporte;
using FluentAssertions;
using Moq;
using Xunit;

namespace back_cabs.Tests.UnitTests.Services;

public class OrdenServicioPruebasServiceTests
{
    private readonly Mock<IOrdenServicioPruebasRepository> _pruebasRepository = new();
    private readonly Mock<IOrdenServicioService> _ordenServicioService = new();
    private readonly Mock<IAdmOrdenServicioRepository> _admOrdenServicioRepository = new();
    private readonly Mock<IAdmClienteRepository> _clienteRepository = new();
    private readonly Mock<IAdmAgenteRepository> _agenteRepository = new();

    private OrdenServicioPruebasService CreateService()
        => new(
            _pruebasRepository.Object,
            _ordenServicioService.Object,
            _admOrdenServicioRepository.Object,
            _clienteRepository.Object,
            _agenteRepository.Object
        );

    [Fact]
    public async Task CreateAsync_GuardaTituloSoloEnActividad()
    {
        var dto = new OrdenServicioPruebasCreateRequestDto
        {
            ClienteId = 7,
            DocumentoId = 123456,
            EsVirtual = true,
            AgentePrincipal = 5,
            TituloEvento = "Visita remota",
            EstadoFactura = "CON FACTURA",
            Observaciones = "Observación de prueba"
        };

        _clienteRepository
            .Setup(x => x.GetByIdWithDomicilioAsync(dto.ClienteId, It.IsAny<int?>()))
            .ReturnsAsync(new AdmCliente { CIdClienteProveedor = dto.ClienteId, CRazonSocial = "Cliente Demo", CRfc = "XAXX010101000" });

        _agenteRepository
            .Setup(x => x.GetByIdAsync(dto.AgentePrincipal!.Value))
            .ReturnsAsync(new AdmAgente { CIdAgente = dto.AgentePrincipal.Value, CNombreAgente = "Agente Demo" });

        AdmDocumento? documentoCapturado = null;
        OrdenServicioActividad? actividadCapturada = null;

        _admOrdenServicioRepository
            .Setup(x => x.CreateDocumentoOrdenServicioAsync(It.IsAny<AdmDocumento>()))
            .Callback<AdmDocumento>(doc => documentoCapturado = doc)
            .ReturnsAsync(321);

        _pruebasRepository
            .Setup(x => x.CreateAsync(It.IsAny<OrdenServicioActividad>()))
            .Callback<OrdenServicioActividad>(act => actividadCapturada = act)
            .ReturnsAsync((OrdenServicioActividad act) =>
            {
                act.Id = 321;
                return act;
            });

        var service = CreateService();
        var response = await service.CreateAsync(dto);

        response.DocumentoId.Should().Be(321);
        response.TituloEvento.Should().Be("Visita remota");

        documentoCapturado.Should().NotBeNull();
        documentoCapturado!.CReferencia.Should().Be("OS-123456");
        documentoCapturado.CObservaciones.Should().Be(dto.Observaciones);
        documentoCapturado.CReferencia.Should().NotContain("Visita remota");
        documentoCapturado.CObservaciones.Should().NotContain("Visita remota");

        actividadCapturada.Should().NotBeNull();
        actividadCapturada!.TituloEvento.Should().Be("Visita remota");
    }

    [Fact]
    public async Task GetAllAsync_IncluyeCamposDesdeAdmDocumentos()
    {
        _pruebasRepository
            .Setup(x => x.GetAllAsync())
            .ReturnsAsync(new List<OrdenServicioActividad>
            {
                new()
                {
                    Id = 1,
                    DocumentoId = 500,
                    FechaCreacion = DateTime.UtcNow,
                    EstadoOrden = "PENDIENTE",
                    EstadoFactura = "PENDIENTE"
                }
            });

        _admOrdenServicioRepository
            .Setup(x => x.GetDocumentosByIdsAsync(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<AdmDocumento>
            {
                new()
                {
                    CIdDocumento = 500,
                    CIdAgente = 99,
                    CTotal = 456.78,
                    CObservaciones = "Observación legacy"
                }
            });

        var service = CreateService();
        var result = await service.GetAllAsync();

        result.Should().HaveCount(1);
        result[0].IdAgentePrincipal.Should().Be(99);
        result[0].Total.Should().Be(456.78m);
        result[0].ObservacionesDocumento.Should().Be("Observación legacy");
    }

    [Theory]
    [InlineData("PENDIENTE")]
    [InlineData("EN_PROCESO")]
    [InlineData("FINALIZADO")]
    public async Task PatchEstadoAsync_AceptaEstadosPermitidos(string estadoOrden)
    {
        var actividad = new OrdenServicioActividad
        {
            Id = 10,
            DocumentoId = 321,
            FechaCreacion = DateTime.UtcNow,
            EstadoOrden = "PENDIENTE",
            EstadoFactura = "PENDIENTE"
        };

        _pruebasRepository
            .Setup(x => x.GetByDocumentoIdAsync(321))
            .ReturnsAsync(actividad);
        _pruebasRepository
            .Setup(x => x.UpdateAsync(It.IsAny<OrdenServicioActividad>()))
            .ReturnsAsync(true);

        var service = CreateService();
        var result = await service.PatchEstadoAsync(321, new OrdenServicioPruebasPatchEstadoDto { EstadoOrden = estadoOrden });

        result.EstadoOrden.Should().Be(estadoOrden);
    }

    [Fact]
    public async Task SearchAsync_SinFiltros_AplicaMesActualYPaginacion()
    {
        var actividades = new List<OrdenServicioActividad>
        {
            new()
            {
                Id = 1,
                DocumentoId = 500,
                FechaCreacion = DateTime.UtcNow,
                EstadoOrden = "PENDIENTE",
                EstadoFactura = "PENDIENTE"
            }
        };

        DateTime? fechaInicioCapturada = null;
        DateTime? fechaFinCapturada = null;

        _pruebasRepository
            .Setup(x => x.GetResumenAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>()))
            .ReturnsAsync(new OrdenServicioPruebasResumenDto
            {
                TotalOrdenes = 1,
                OrdenesEnEspera = 1,
                OrdenesEnProceso = 0,
                OrdenesTerminadas = 0
            });

        _pruebasRepository
            .Setup(x => x.SearchAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<int>(),
                It.IsAny<int>()))
            .Callback<string?, string?, int?, int?, DateTime?, DateTime?, int, int>((_, _, _, _, fechaInicio, fechaFin, _, _) =>
            {
                fechaInicioCapturada = fechaInicio;
                fechaFinCapturada = fechaFin;
            })
            .ReturnsAsync((actividades, 1));

        _admOrdenServicioRepository
            .Setup(x => x.GetDocumentosByIdsAsync(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<AdmDocumento>
            {
                new()
                {
                    CIdDocumento = 500,
                    CIdAgente = 9,
                    CTotal = 123.45,
                    CObservaciones = "Legacy"
                }
            });

        var service = CreateService();
        var result = await service.SearchAsync(new OrdenServicioPruebasListRequestDto());

        result.Should().BeOfType<OrdenServicioPruebasPagedResponseDto>();
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(10);
        result.TotalItems.Should().Be(1);
        result.TotalPages.Should().Be(1);
        result.Items.Should().HaveCount(1);
        result.Items[0].Folio.Should().Be("ORD-000500");
        result.ResumenGlobal.TotalOrdenes.Should().Be(1);
        result.ResumenFiltrado.OrdenesEnEspera.Should().Be(1);

        fechaInicioCapturada.Should().NotBeNull();
        fechaFinCapturada.Should().NotBeNull();
        fechaInicioCapturada!.Value.Day.Should().Be(1);
        fechaInicioCapturada.Value.TimeOfDay.Should().Be(TimeSpan.Zero);
        fechaFinCapturada!.Value.Should().BeAfter(fechaInicioCapturada.Value);
    }

    [Fact]
    public async Task SearchAsync_FechaInvalida_LanzaArgumentException()
    {
        var service = CreateService();

        var action = () => service.SearchAsync(new OrdenServicioPruebasListRequestDto
        {
            FechaInicio = "2026-08-01"
        });

        await action.Should().ThrowAsync<ArgumentException>()
            .WithMessage("fechaInicio debe tener el formato dd/MM/yyyy.");
    }

    [Fact]
    public async Task SearchAsync_RangoInvalido_LanzaArgumentException()
    {
        var service = CreateService();

        var action = () => service.SearchAsync(new OrdenServicioPruebasListRequestDto
        {
            FechaInicio = "31/08/2026",
            FechaFin = "01/08/2026"
        });

        await action.Should().ThrowAsync<ArgumentException>()
            .WithMessage("fechaInicio no puede ser mayor que fechaFin.");
    }

    [Fact]
    public async Task SearchAsync_ConEstado_CalculaResumenGlobalYSesgadoPorSeparado()
    {
        string? estadoResumenGlobal = "sin-llamada";
        string? estadoResumenFiltrado = "sin-llamada";

        _pruebasRepository
            .Setup(x => x.GetResumenAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>()))
            .Callback<string?, string?, int?, int?, DateTime?, DateTime?>((_, estadoOrden, _, _, _, _) =>
            {
                if (estadoResumenGlobal == "sin-llamada")
                {
                    estadoResumenGlobal = estadoOrden;
                    return;
                }

                estadoResumenFiltrado = estadoOrden;
            })
            .ReturnsAsync((string? _, string? estadoOrden, int? _, int? _, DateTime? _, DateTime? _) =>
                estadoOrden == null
                    ? new OrdenServicioPruebasResumenDto
                    {
                        TotalOrdenes = 125,
                        OrdenesEnEspera = 40,
                        OrdenesEnProceso = 50,
                        OrdenesTerminadas = 35
                    }
                    : new OrdenServicioPruebasResumenDto
                    {
                        TotalOrdenes = 20,
                        OrdenesEnEspera = 5,
                        OrdenesEnProceso = 10,
                        OrdenesTerminadas = 5
                    });

        _pruebasRepository
            .Setup(x => x.SearchAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<int>(),
                It.IsAny<int>()))
            .ReturnsAsync((new List<OrdenServicioActividad>(), 20));

        _admOrdenServicioRepository
            .Setup(x => x.GetDocumentosByIdsAsync(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<AdmDocumento>());

        var service = CreateService();
        var result = await service.SearchAsync(new OrdenServicioPruebasListRequestDto
        {
            EstadoOrden = "EN_PROCESO",
            FechaInicio = "01/08/2026",
            FechaFin = "31/08/2026"
        });

        estadoResumenGlobal.Should().BeNull();
        estadoResumenFiltrado.Should().Be("EN_PROCESO");
        result.ResumenGlobal.TotalOrdenes.Should().Be(125);
        result.ResumenFiltrado.TotalOrdenes.Should().Be(20);
        result.ResumenFiltrado.OrdenesEnProceso.Should().Be(10);
    }
}
