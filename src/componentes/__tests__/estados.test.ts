import {
  ESTADOS_CONTRATO,
  ESTADOS_DATOS,
  ESTADOS_MANTENIMIENTO,
  ESTADOS_PAGO,
  ESTADOS_PAGO_CONTRATO,
  ESTADOS_PERIODO,
  ESTADOS_UNIDAD,
  ESTADOS_VINCULO,
  etiquetaVenceEn,
  MAPAS_ESTADO,
  URGENCIAS,
} from '../estados';
import { coloresEstado } from '../../tema';

const etiquetas = (mapa: Record<string, { etiqueta: string }>) =>
  Object.values(mapa)
    .map((d) => d.etiqueta)
    .sort();

describe('mapas de ChipEstado: todos los estados del Contexto', () => {
  it('pago (§7.3): Pendiente se muestra como "En revisión"', () => {
    expect(etiquetas(ESTADOS_PAGO)).toEqual([
      'Aprobado',
      'En revisión',
      'Rechazado',
      'Reemplazado',
    ]);
    expect(ESTADOS_PAGO.PENDIENTE.etiqueta).toBe('En revisión');
  });

  it('período (§5.15)', () => {
    expect(etiquetas(ESTADOS_PERIODO)).toEqual([
      'En revisión',
      'Pagado',
      'Parcial',
      'Por vencer',
      'Vencido',
    ]);
    // Un período con comprobante pendiente es "En revisión", nunca "Vencido".
    expect(ESTADOS_PERIODO.EN_REVISION.tono).toBe('informacion');
    expect(ESTADOS_PERIODO.PARCIAL.senal).toBe('media');
  });

  it('pago del contrato (§7.2)', () => {
    expect(etiquetas(ESTADOS_PAGO_CONTRATO)).toEqual(['Al día', 'En mora', 'Pendiente']);
  });

  it('contrato (§7.1): VENCIDO del backend es "Finalizado"; "Próximo a vencer" no es un estado', () => {
    expect(etiquetas(ESTADOS_CONTRATO)).toEqual([
      'Activo',
      'Cancelado',
      'Finalizado',
      'Programado',
      'Terminado anticipadamente',
    ]);
    expect(ESTADOS_CONTRATO.VENCIDO.etiqueta).toBe('Finalizado');
    expect(Object.keys(ESTADOS_CONTRATO)).not.toContain('PROXIMO_A_VENCER');
  });

  it('vínculo (§7.5), unidad y mantenimiento (§7.4)', () => {
    expect(etiquetas(ESTADOS_VINCULO)).toEqual(['Sin vincular', 'Vinculado']);
    expect(etiquetas(ESTADOS_UNIDAD)).toEqual(['Libre', 'Ocupada']);
    expect(etiquetas(ESTADOS_MANTENIMIENTO)).toEqual(['En proceso', 'Pendiente', 'Resuelto']);
  });

  it('urgencia (§5.14)', () => {
    expect(etiquetas(URGENCIAS)).toEqual(['Alta', 'Baja', 'Media']);
  });

  it('no aparecen estados inventados', () => {
    const todas = Object.values(MAPAS_ESTADO).flatMap((m) => etiquetas(m));
    for (const prohibida of ['Vacante', 'En mantenimiento', 'Próximo a vencer', 'Vencida']) {
      expect(todas).not.toContain(prohibida);
    }
  });

  it('cada estado usa un tono que existe en el tema', () => {
    for (const mapa of [...Object.values(MAPAS_ESTADO), URGENCIAS]) {
      for (const definicion of Object.values(mapa)) {
        expect(coloresEstado).toHaveProperty(definicion.tono);
      }
    }
  });
});

describe('etiquetaVenceEn', () => {
  it('texto según los días', () => {
    expect(etiquetaVenceEn(30)).toBe('Vence en 30 días');
    expect(etiquetaVenceEn(1)).toBe('Vence mañana');
    expect(etiquetaVenceEn(0)).toBe('Vence hoy');
  });

  it('rechaza días negativos o fraccionarios', () => {
    expect(() => etiquetaVenceEn(-1)).toThrow();
    expect(() => etiquetaVenceEn(1.5)).toThrow();
  });
});

describe('estado de los datos de una unidad', () => {
  it('"Por completar" (unidad con área, habitaciones, baños u ocupantes en null) es un aviso de media luz', () => {
    expect(ESTADOS_DATOS.POR_COMPLETAR).toEqual({
      etiqueta: 'Por completar',
      tono: 'advertencia',
      senal: 'media',
    });
    expect(MAPAS_ESTADO.datos).toBe(ESTADOS_DATOS);
  });
});
