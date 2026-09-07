# Explicación del json para el XML 

## Tabla Json 
| json | Valores calculados desde XML |
|------|------------------------------|
| idCliente | defecto|
| razonSocial | por definir |
| idAgente | por definir |
| fechaVencimiento | por definir |
| fechaProntoPago | por definir |
| fechaEntregaRecepcion | por definir |
| productos[0].idProducto | por definir |
| productos[0].idMovimiento | por definir |
| productos[0].idUnidad | por definir |
| productos[0].unidades | 1 (cantidad del cargo AGUA) |
| productos[0].precio | 583.16 (costo del cargo AGUA) |
| productos[0].porcentajeDescuento | sin descuento |
| productos[0].descuentoImporte | sin descuento |
| productos[0].observaciones | "AGUA" (descripcionConceptoMovimiento) |
| descuentoDoc1 | sin descuento |
| descuentoDoc2 | sin descuento |
| descuentoDoc3 | sin descuento |
| cTotal | sin descuento |
| productos | (neto + impuesto1) |
| montoPagado | sin descuento |
| observaciones | sin descuento |
| referencia | sin descuento |
| aplicarIVA | true (aplica IVA) |
| tipoCambio | sin descuento |
| porcentajeIVA | 16 (tasa estándar IVA México) |
| idDocumentoDe | por definir|
| idConceptoDocumento | Sin descuento |
| idMoneda | por definir |
| folio | 0 (por definir) |
| naturaleza |2 (egreso/compra) |
| usaCliente | 1 (usa cliente) |
| afectado | 1 (afectado) |
| impreso | 1 (afectado) |
| afectado | 1 (afectado) |
| neto | 1 (afectado) |
| impuesto1 | 878.45 (suma de todos los costoTotal de ListaCargos) |
| descuentoMov |0 (sin descuentoMov) |
| total | 1019.00 (neto + impuesto1 = 878.45 + 140.55) |
| pendiente | 1019.00 (mismo valor que total) |
| totalUnidades | 5 (número de conceptos en ListaCargos) |













## Considencias encontradas

| json | Valores calculados desde XML |
|------|------------------------------|
| neto | Suma de todos los costoTotal de ListaCargos = 583.16 + 175.02 + 104.43 + 15.16 + 0.68 = 878.45|
| impuesto1 | Suma de todos los costoTotal de ListaImpuestos = 93.3 + 28 + 16.71 + 2.43 + 0.11 = 140.55 |
| total | neto + impuesto1 = 878.45 + 140.55 = 1019.00 |
| totalUnidades | Contador de los productos |
| porcentajeIVA | 16% |



## Ejemplo del json

```json
{
  "idCliente": 2147483647,
  "razonSocial": "string",
  "idAgente": 2147483647,
  "fechaVencimiento": "2026-04-07T16:00:40.982Z",
  "fechaProntoPago": "2026-04-07T16:00:40.982Z",
  "fechaEntregaRecepcion": "2026-04-07T16:00:40.982Z",
  "productos": [
    {
      "idProducto": 2147483647,
      "idAlmacen": 0,
      "idMovimiento": 0,
      "idUnidad": 0,
      "unidades": 1,
      "precio": 583.16,
      "porcentajeDescuento": 0,
      "descuentoImporte": 0,
      "observaciones": "AGUA"
    },
    {
      "idProducto": 2147483647,
      "idAlmacen": 0,
      "idMovimiento": 0,
      "idUnidad": 0,
      "unidades": 1,
      "precio": 175.02,
      "porcentajeDescuento": 0,
      "descuentoImporte": 0,
      "observaciones": "DRENAJE"
    },
    {
      "idProducto": 2147483647,
      "idAlmacen": 0,
      "idMovimiento": 0,
      "idUnidad": 0,
      "unidades": 1,
      "precio": 104.43,
      "porcentajeDescuento": 0,
      "descuentoImporte": 0,
      "observaciones": "SANEAMIENTO"
    },
    {
      "idProducto": 2147483647,
      "idAlmacen": 0,
      "idMovimiento": 0,
      "idUnidad": 0,
      "unidades": 1,
      "precio": 15.16,
      "porcentajeDescuento": 0,
      "descuentoImporte": 0,
      "observaciones": "CRUZ ROJA/BOMBEROS (VOLUNTARIO)"
    },
    {
      "idProducto": 2147483647,
      "idAlmacen": 0,
      "idMovimiento": 0,
      "idUnidad": 0,
      "unidades": 1,
      "precio": 0.68,
      "porcentajeDescuento": 0,
      "descuentoImporte": 0,
      "observaciones": "CARGO POR REDONDEO"
    }
  ],
  "descuentoDoc1": 0,
  "descuentoDoc2": 0,
  "descuentoDoc3": 0,
  "cTotal": 1019.00,
  "montoPagado": 0,
  "observaciones": "string",
  "referencia": "string",
  "aplicarIVA": true,
  "tipoCambio": 0,
  "porcentajeIVA": 16,
  "idDocumentoDe": 2147483647,
  "idConceptoDocumento": 2147483647,
  "idClienteProveedor": 2147483647,
  "idMoneda": 2147483647,
  "serieDocumento": "string",
  "folio": 0,
  "naturaleza": 2,
  "usaCliente": 1,
  "afectado": 1,
  "impreso": 1,
  "cancelado": 1,
  "neto": 878.45,
  "impuesto1": 140.55,
  "descuentoMov": 0,
  "total": 1019.00,
  "pendiente": 1019.00,
  "totalUnidades": 5
}
```



