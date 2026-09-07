-- Migration 003: Add NotasSoporte column to OrdenServicioActividad
-- This column can only be populated when EstadoOrden = 'EN_PROCESO'
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrdenServicioActividad'
      AND COLUMN_NAME = 'NotasSoporte'
)
BEGIN
    ALTER TABLE dbo.OrdenServicioActividad
    ADD NotasSoporte NVARCHAR(MAX) NULL;
END
