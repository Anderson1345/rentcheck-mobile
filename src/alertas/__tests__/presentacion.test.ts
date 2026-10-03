import openapi from '../../../docs/api/openapi.json';
import { NOMBRES_ICONOS } from '../../componentes/iconos/Icono';
import { coloresEstado } from '../../tema';
import { PRESENTACION_ALERTA, presentacionDeAlerta } from '../presentacion';

// Los 19 valores salen del OpenAPI del repo: si el backend agrega uno y se regenera, esta prueba y
// `Record<TipoAlerta, …>` (en compilación) obligan a darle presentación.
const TIPOS: string[] = openapi.components.schemas.TipoAlerta.enum;

describe('presentación de las alertas', () => {
  it('el OpenAPI trae los 19 tipos de alerta', () => {
    expect(TIPOS).toHaveLength(19);
  });

  it.each(TIPOS)('%s tiene icono existente, tono válido y título corto', (tipo) => {
    const p = PRESENTACION_ALERTA[tipo as keyof typeof PRESENTACION_ALERTA];
    expect(p).toBeDefined();
    expect(NOMBRES_ICONOS).toContain(p.icono);
    expect(Object.keys(coloresEstado)).toContain(p.tono);
    expect(p.titulo.trim().length).toBeGreaterThan(0);
    expect(p.titulo.length).toBeLessThanOrEqual(32);
  });

  it('no hay presentaciones de tipos que el OpenAPI no tiene', () => {
    expect(Object.keys(PRESENTACION_ALERTA).sort()).toEqual([...TIPOS].sort());
  });

  it('un tipo desconocido que llegue del servidor cae a una presentación segura', () => {
    const p = presentacionDeAlerta('TIPO_DEL_FUTURO');
    expect(p.icono).toBe('alerta');
    expect(p.tono).toBe('neutro');
    expect(p.titulo).toBe('Aviso');
  });

  it('un tipo conocido devuelve su presentación', () => {
    expect(presentacionDeAlerta('PAGO_RECHAZADO')).toEqual(PRESENTACION_ALERTA.PAGO_RECHAZADO);
  });
});
