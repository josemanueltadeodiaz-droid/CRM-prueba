using Xunit;
using FluentAssertions;
using back_cabs.CRM.contexts;
using back_cabs.CRM.models.Shared;
using back_cabs.CRM.repositories.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace back_cabs.Tests.UnitTests.Repositories
{
    /// <summary>
    /// ✅ Tests para las operaciones transaccionales de VehiculoRepository
    /// 
    /// OBJETIVO: Verificar que las operaciones compuestas (RegistrarInicioUsoCompletoAsync, 
    /// FinalizarUsoCompletoAsync) mantienen la atomicidad y evitan registros huérfanos.
    /// 
    /// 📚 QUÉ APRENDERÁS AQUÍ:
    /// - Cómo testear transacciones en EF Core
    /// - Cómo verificar atomicidad (todo o nada)
    /// - Cómo simular fallos en transacciones
    /// - Patrones para tests de operaciones críticas
    /// </summary>
    public class VehiculoRepositoryTransactionalTests : IDisposable
    {
        private readonly WriteContext _writeContext;
        private readonly ReadOnlyContext _readContext;
        private readonly VehiculoRepository _repository;
        private readonly Mock<ILogger<VehiculoRepository>> _mockLogger;
        private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;

        public VehiculoRepositoryTransactionalTests()
        {
            // Usar in-memory database para tests
            var writeOptions = new DbContextOptionsBuilder<WriteContext>()
                .UseInMemoryDatabase($"TestDb_Write_{Guid.NewGuid()}")
                .Options;

            var readOptions = new DbContextOptionsBuilder<ReadOnlyContext>()
                .UseInMemoryDatabase($"TestDb_Read_{Guid.NewGuid()}")
                .Options;

            _writeContext = new WriteContext(writeOptions);
            _readContext = new ReadOnlyContext(readOptions);

            _mockLogger = new Mock<ILogger<VehiculoRepository>>();
            _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();

            // Setup para obtener usuario actual
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, "1")
            };
            var identity = new ClaimsIdentity(claims);
            var principal = new ClaimsPrincipal(identity);
            var httpContext = new DefaultHttpContext { User = principal };
            _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(httpContext);

            _repository = new VehiculoRepository(
                _writeContext,
                _readContext,
                _mockLogger.Object,
                _mockHttpContextAccessor.Object);
        }

        public void Dispose()
        {
            _writeContext?.Dispose();
            _readContext?.Dispose();
        }

        #region RegistrarInicioUsoCompletoAsync Tests

        [Fact]
        public async Task RegistrarInicioUsoCompletoAsync_ConDatosValidos_DebeMarcarVehiculoComoNoDisponible()
        {
            // Arrange
            var vehiculo = new Vehiculo
            {
                NombreVehiculo = "Toyota Corolla",
                Placas = "ABC123",
                Disponible = true,
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 50000
            };

            _writeContext.Vehiculos.Add(vehiculo);
            await _writeContext.SaveChangesAsync();

            var uso = new UsoVehiculo
            {
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow,
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = "Entrega de paquetes",
                KilometrajeInicial = 50000,
                Estado = "EN_USO"
            };

            // Act
            var vehiculoActualizado = await _repository.RegistrarInicioUsoCompletoAsync(
                vehiculo.Id, uso, 50000);

            // Assert
            vehiculoActualizado.Should().NotBeNull();
            vehiculoActualizado.Disponible.Should().BeFalse("porque el vehículo debe estar marcado como NO disponible");

            // Verificar que el uso fue creado
            var usoCreado = _writeContext.Set<UsoVehiculo>()
                .FirstOrDefault(u => u.VehiculoId == vehiculo.Id && u.Estado == "EN_USO");
            usoCreado.Should().NotBeNull("porque el registro de uso debe haber sido creado");
            usoCreado!.MotivoUso.Should().Be("Entrega de paquetes");
        }

        [Fact]
        public async Task RegistrarInicioUsoCompletoAsync_ConKilometrajeInicial_DebeActualizarKilometrajeVehiculo()
        {
            // Arrange
            var vehiculo = new Vehiculo
            {
                NombreVehiculo = "Ford Fiesta",
                Placas = "XYZ789",
                Disponible = true,
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 45000  // Kilometraje anterior
            };

            _writeContext.Vehiculos.Add(vehiculo);
            await _writeContext.SaveChangesAsync();

            var uso = new UsoVehiculo
            {
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow,
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = "Entrega",
                KilometrajeInicial = 50000,  // Mayor que el anterior
                Estado = "EN_USO"
            };

            // Act
            var vehiculoActualizado = await _repository.RegistrarInicioUsoCompletoAsync(
                vehiculo.Id, uso, 50000);

            // Assert
            vehiculoActualizado.Kilometraje.Should().Be(50000, 
                "porque debe actualizar el kilometraje si el inicial es mayor");
        }

        [Fact]
        public async Task RegistrarInicioUsoCompletoAsync_ConVehiculoNoDisponible_DebeThrowException()
        {
            // Arrange
            var vehiculo = new Vehiculo
            {
                NombreVehiculo = "Honda Civic",
                Placas = "DEF456",
                Disponible = false,  // NO disponible
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 30000
            };

            _writeContext.Vehiculos.Add(vehiculo);
            await _writeContext.SaveChangesAsync();

            var uso = new UsoVehiculo
            {
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow,
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = "Entrega",
                KilometrajeInicial = 30000,
                Estado = "EN_USO"
            };

            // Act & Assert
            var accion = async () => await _repository.RegistrarInicioUsoCompletoAsync(
                vehiculo.Id, uso, 30000);

            await accion.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*no está disponible*");

            // Verificar que NO creó registro de uso (ROLLBACK funcionó)
            var usoCreado = _writeContext.Set<UsoVehiculo>()
                .FirstOrDefault(u => u.VehiculoId == vehiculo.Id);
            usoCreado.Should().BeNull("porque la transacción debe hacer ROLLBACK al fallar");
        }

        [Fact]
        public async Task RegistrarInicioUsoCompletoAsync_ConIdInexistente_DebeThrowKeyNotFoundException()
        {
            // Arrange
            var uso = new UsoVehiculo
            {
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow,
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = "Entrega",
                KilometrajeInicial = 0,
                Estado = "EN_USO"
            };

            // Act & Assert
            var accion = async () => await _repository.RegistrarInicioUsoCompletoAsync(
                999, uso, 0);

            await accion.Should().ThrowAsync<KeyNotFoundException>();
        }

        #endregion

        #region FinalizarUsoCompletoAsync Tests

        [Fact]
        public async Task FinalizarUsoCompletoAsync_ConDatosValidos_DebeMarcarVehiculoComoDisponible()
        {
            // Arrange: Setup inicial con vehículo en uso
            var vehiculo = new Vehiculo
            {
                NombreVehiculo = "Nissan Versa",
                Placas = "GHI123",
                Disponible = false,  // En uso
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 50000
            };

            _writeContext.Vehiculos.Add(vehiculo);
            await _writeContext.SaveChangesAsync();

            var uso = new UsoVehiculo
            {
                VehiculoId = vehiculo.Id,
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow.AddHours(-2),
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.AddHours(-2).TimeOfDay,
                MotivoUso = "Entrega",
                KilometrajeInicial = 50000,
                Estado = "EN_USO"
            };

            _writeContext.Set<UsoVehiculo>().Add(uso);
            await _writeContext.SaveChangesAsync();

            // Act
            var fechaFin = DateTime.UtcNow;
            uso.FechaFin = fechaFin;
            uso.HoraRegreso = fechaFin.TimeOfDay;
            uso.KilometrajeFinal = 50150;
            uso.Estado = "COMPLETADO";

            var vehiculoActualizado = await _repository.FinalizarUsoCompletoAsync(
                vehiculo.Id, uso, 50150);

            // Assert
            vehiculoActualizado.Should().NotBeNull();
            vehiculoActualizado.Disponible.Should().BeTrue("porque el vehículo debe estar disponible después de finalizar");
            vehiculoActualizado.Kilometraje.Should().Be(50150, "porque debe actualizar el kilometraje final");

            // Verificar que el uso fue actualizado
            var usoActualizado = _writeContext.Set<UsoVehiculo>()
                .FirstOrDefault(u => u.Id == uso.Id);
            usoActualizado.Should().NotBeNull();
            usoActualizado!.FechaFin.Should().NotBeNull("porque debe tener fecha final");
            usoActualizado.KilometrajeFinal.Should().Be(50150);
            usoActualizado.Estado.Should().Be("COMPLETADO");
        }

        [Fact]
        public async Task FinalizarUsoCompletoAsync_ConIdVehiculoInexistente_DebeThrowKeyNotFoundException()
        {
            // Arrange
            var uso = new UsoVehiculo
            {
                VehiculoId = 999,
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow.AddHours(-1),
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = "Entrega",
                KilometrajeInicial = 50000,
                KilometrajeFinal = 50100,
                Estado = "COMPLETADO"
            };

            // Act & Assert
            var accion = async () => await _repository.FinalizarUsoCompletoAsync(
                999, uso, 50100);

            await accion.Should().ThrowAsync<KeyNotFoundException>();

            // Verificar que el uso NO fue actualizado (ROLLBACK funcionó)
            var usoEnBd = _writeContext.Set<UsoVehiculo>()
                .FirstOrDefault(u => u.VehiculoId == 999);
            usoEnBd.Should().BeNull("porque la transacción debe hacer ROLLBACK al fallar");
        }

        [Fact]
        public async Task FinalizarUsoCompletoAsync_DebeActualizarTodoAtomicamente()
        {
            // Arrange: Setup más completo simulando un escenario real
            var vehiculo = new Vehiculo
            {
                NombreVehiculo = "Hyundai Accent",
                Placas = "JKL456",
                Disponible = false,  // En uso
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 75000
            };

            _writeContext.Vehiculos.Add(vehiculo);
            await _writeContext.SaveChangesAsync();

            var uso = new UsoVehiculo
            {
                VehiculoId = vehiculo.Id,
                UsuarioId = 2,
                FechaInicio = DateTime.UtcNow.AddHours(-3),
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.AddHours(-3).TimeOfDay,
                MotivoUso = "Viaje de negocios",
                KilometrajeInicial = 75000,
                Estado = "EN_USO"
            };

            _writeContext.Set<UsoVehiculo>().Add(uso);
            await _writeContext.SaveChangesAsync();

            var fechaFin = DateTime.UtcNow;

            // Act
            uso.FechaFin = fechaFin;
            uso.HoraRegreso = fechaFin.TimeOfDay;
            uso.KilometrajeFinal = 75350;  // 350 km recorridos
            uso.Observaciones = "Viaje completado sin incidentes";
            uso.Estado = "COMPLETADO";

            var resultado = await _repository.FinalizarUsoCompletoAsync(
                vehiculo.Id, uso, 75350);

            // Assert - Verificar que TODAS las actualizaciones se aplicaron atómicamente
            resultado.Disponible.Should().BeTrue();
            resultado.Kilometraje.Should().Be(75350);

            var usoFinal = _writeContext.Set<UsoVehiculo>()
                .FirstOrDefault(u => u.Id == uso.Id);
            usoFinal.Should().NotBeNull();
            usoFinal!.FechaFin.Should().Be(fechaFin);
            usoFinal.HoraRegreso.Should().Be(fechaFin.TimeOfDay);
            usoFinal.KilometrajeFinal.Should().Be(75350);
            usoFinal.Observaciones.Should().Be("Viaje completado sin incidentes");
            usoFinal.Estado.Should().Be("COMPLETADO");
        }

        #endregion

        #region Tests de Atomicidad

        [Fact]
        public async Task RegistrarInicioUsoCompletoAsync_SiCreacionUsoFalla_DebeHacerRollbackDelVehiculo()
        {
            // Arrange: Simular que el contexto falla durante la creación del uso
            var vehiculo = new Vehiculo
            {
                NombreVehiculo = "Chevrolet Spark",
                Placas = "MNO789",
                Disponible = true,
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 20000
            };

            _writeContext.Vehiculos.Add(vehiculo);
            await _writeContext.SaveChangesAsync();

            var usoInvalido = new UsoVehiculo
            {
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow,
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = new string('a', 501),  // Excede StringLength(500)
                KilometrajeInicial = 20000,
                Estado = "EN_USO"
            };

            // Act & Assert
            var accion = async () => await _repository.RegistrarInicioUsoCompletoAsync(
                vehiculo.Id, usoInvalido, 20000);

            await accion.Should().ThrowAsync<DbUpdateException>();

            // ✅ CRUCIAL: Verificar que el vehículo NO fue marcado como no disponible (ROLLBACK)
            var vehiculoFinal = _writeContext.Vehiculos.Find(vehiculo.Id);
            vehiculoFinal.Should().NotBeNull();
            vehiculoFinal!.Disponible.Should().BeTrue(
                "porque la transacción debe hacer ROLLBACK completo si falla el uso");
        }

        [Fact]
        public async Task RegistrarInicioUsoCompletoAsync_AtomicidadCompleta_NoRegistrosHuerfanos()
        {
            // Arrange: Verificar que no hay orphans en ninguna situación
            var vehiculo1 = new Vehiculo
            {
                NombreVehiculo = "Vehículo 1",
                Placas = "PQR111",
                Disponible = true,
                Activo = true,
                EsDeEmpresa = true,
                Kilometraje = 10000
            };

            _writeContext.Vehiculos.Add(vehiculo1);
            await _writeContext.SaveChangesAsync();

            var uso1 = new UsoVehiculo
            {
                UsuarioId = 1,
                FechaInicio = DateTime.UtcNow,
                Fecha = DateTime.UtcNow.Date,
                HoraSalida = DateTime.UtcNow.TimeOfDay,
                MotivoUso = "Uso normal",
                KilometrajeInicial = 10000,
                Estado = "EN_USO"
            };

            // Act - Operación exitosa
            var resultado = await _repository.RegistrarInicioUsoCompletoAsync(
                vehiculo1.Id, uso1, 10000);

            // Assert
            var conteoUsos = _writeContext.Set<UsoVehiculo>()
                .Count(u => u.VehiculoId == vehiculo1.Id);

            conteoUsos.Should().Be(1, "porque solo debe haber un uso para este vehículo");
            resultado.Disponible.Should().BeFalse("porque debe estar marcado como no disponible");

            // No debe haber vehículos huérfanos (sin uso pero marcados como no disponibles)
            var vehiculosOrfanos = _writeContext.Vehiculos
                .Where(v => !v.Disponible)
                .Where(v => !_writeContext.Set<UsoVehiculo>()
                    .Any(u => u.VehiculoId == v.Id && u.Estado == "EN_USO"))
                .ToList();

            vehiculosOrfanos.Should().BeEmpty(
                "porque no debe haber vehículos marcados como ocupados sin un uso activo correspondiente");
        }

        #endregion
    }
}
