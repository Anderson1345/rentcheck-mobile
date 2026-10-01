import { StyleSheet, View } from 'react-native';

import type { InquilinoFicha } from '../../api/contratos';
import type { BorradorContrato } from '../../contratos/esquemas';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { CampoTexto } from '../CampoTexto';
import { ChipEstado } from '../ChipEstado';
import { ControlSegmentado } from '../ControlSegmentado';
import { FilaLista } from '../FilaLista';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

type Errores = Partial<Record<keyof BorradorContrato, string>>;

interface Props {
  valores: BorradorContrato;
  errores: Errores;
  inquilinos: InquilinoFicha[];
  cambiar: (parcial: Partial<BorradorContrato>) => void;
}

const OPCIONES = [
  { valor: 'nuevo', etiqueta: 'Nuevo' },
  { valor: 'existente', etiqueta: 'Ya arrendó conmigo' },
] as const;

/** Paso 2: inquilino nuevo (nombre, documento, teléfono) o uno que ya arrendó con el arrendador. */
export function PasoInquilino({ valores, errores, inquilinos, cambiar }: Props) {
  const puedeExistente = inquilinos.length > 0;
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        ¿Quién va a arrendar?
      </Texto>
      {puedeExistente ? (
        <ControlSegmentado
          opciones={OPCIONES}
          valor={valores.modoInquilino}
          onCambio={(modoInquilino) => cambiar({ modoInquilino })}
        />
      ) : null}

      {valores.modoInquilino === 'existente' && puedeExistente ? (
        <>
          <Superficie relleno="ninguno">
            {inquilinos.map((q, indice) => (
              <FilaLista
                key={q.id}
                avatar={q.nombre}
                titulo={q.nombre}
                separador={indice > 0}
                valor={q.id === valores.inquilinoId ? 'Elegido' : undefined}
                onPress={() => cambiar({ inquilinoId: q.id })}
                detalle={
                  <View style={estilos.detalle}>
                    <Texto variante="secundario" color={colores.textoSecundario}>
                      {q.cedula}
                    </Texto>
                    <ChipEstado
                      tipo="vinculo"
                      estado={q.vinculado ? 'VINCULADO' : 'SIN_VINCULAR'}
                    />
                  </View>
                }
              />
            ))}
          </Superficie>
          {errores.inquilinoId ? <Aviso mensaje={errores.inquilinoId} /> : null}
          <Texto variante="secundario" color={colores.textoSecundario}>
            Se usarán los datos de tu último contrato con esta persona. Si cambiaron, usa Nuevo con
            el mismo documento.
          </Texto>
        </>
      ) : (
        <>
          <CampoTexto
            etiqueta="Nombre completo"
            valor={valores.nombre}
            onCambio={(nombre) => cambiar({ nombre })}
            error={errores.nombre}
            keyboardType="default"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <CampoTexto
            etiqueta="Documento de identidad"
            valor={valores.documento}
            onCambio={(documento) => cambiar({ documento })}
            error={errores.documento}
            keyboardType="default"
            autoCapitalize="characters"
            returnKeyType="next"
          />
          <CampoTexto
            etiqueta="Teléfono"
            valor={valores.telefono}
            onCambio={(telefono) => cambiar({ telefono })}
            error={errores.telefono}
            keyboardType="phone-pad"
            returnKeyType="done"
            ayuda="Si esta persona ya usa RentCheck, el contrato quedará asociado a su cuenta por su documento."
          />
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  detalle: { gap: 4 },
});
