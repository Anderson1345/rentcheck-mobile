// Contratos de ejemplo para las pruebas: un elemento de GET /contratos con la forma real (ContratoListaDto).
import type { ContratoResumen } from '../api/contratos';

export function contratoListaEjemplo(extra: Partial<ContratoResumen> = {}): ContratoResumen {
  return {
    id: 'c1',
    arrendador_id: 'a1',
    unidad_id: 'u1',
    inquilino_id: 'q1',
    unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
    inquilino: { id: 'q1', nombre: 'Camilo Pardo' },
    codigo_acceso: null,
    tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
    canon_centavos: 250_000_000,
    dia_pago: 5,
    forma_pago: 'Transferencia',
    deposito_centavos: null,
    datos_recaudo: 'Cuenta de ahorros 123',
    datos_fiador_o_poliza: null,
    condicionesParticularesTexto: null,
    fecha_inicio: '2026-10-01T00:00:00.000Z',
    fecha_fin: '2027-09-30T00:00:00.000Z',
    estado: 'ACTIVO',
    estado_pago: 'AL_DIA',
    creado_en: '2026-09-25T15:00:00.000Z',
    terminacionAnticipadaSolicitada: false,
    terminacionAnticipadaSolicitadaPor: null,
    terminacionAnticipadaSolicitadaEn: null,
    terminacionAnticipadaMotivo: null,
    terminacionAnticipadaConfirmadaEn: null,
    terminacion_fecha_efectiva: null,
    terminacion_confirmada_por: null,
    cancelado_en: null,
    vinculado_en: null,
    vinculado: false,
    pdf_contrato_url: null,
    ...extra,
  };
}
