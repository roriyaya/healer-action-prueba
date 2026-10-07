import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__Configuracion = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const base = '/api/boveda/' + MEITI.obtenerTabla('configuracion_app');

  const soyAdmin = MEITI.soyDuenoDeLaApp() || MEITI.miRolEnLaApp() === 'admin';

  const [pestana, setPestana] = React.useState('ayuda');
  const [filas, setFilas] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [aviso, setAviso] = React.useState(null);

  const VACIO = { titulo: '', cuerpo: '', tono: 'neutro' };
  const [editando, setEditando] = React.useState(null);
  const [forma, setForma] = React.useState(VACIO);
  const [abierto, setAbierto] = React.useState(false);

  const cargar = async () => {
    setCargando(true);
    const r = await MEITI.fetchDatos(base + '?ecosistema=' + eco);
    if (r.ok) setFilas(r.registros);
    setCargando(false);
  };

  React.useEffect(() => { cargar(); }, []);

  const cerrarFormulario = () => { setAbierto(false); setEditando(null); setForma(VACIO); };

  const guardar = async () => {
    if (!forma.titulo.trim()) { setAviso('Ponle un título antes de guardar.'); return; }
    const fila = editando || {};
    const cuerpo = {
      id: fila.id || (pestana + '_' + Date.now()),
      seccion: pestana,
      titulo: forma.titulo.trim(),
      cuerpo: forma.cuerpo,
      tono: forma.tono || 'neutro',
      orden: fila.orden != null ? fila.orden : filas.filter(f => f.seccion === pestana).length,
      fecha: fila.fecha || new Date().toISOString()
    };
    const r = await MEITI.fetchMutante(base + '?ecosistema=' + eco + (editando ? '&id=' + fila.id : ''), {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
    if (r && r.ok === false) { setAviso('No se pudo guardar. Vuelve a intentarlo.'); return; }
    setAviso(null);
    cerrarFormulario();
    cargar();
  };

  const borrar = async (fila) => {
    if (!await MEITI.confirmar('¿Borrar "' + (fila.titulo || 'este registro') + '"?', { titulo: MEITI.t('delete_action', null, 'Borrar'), confirmar: MEITI.t('delete_confirm', null, 'Sí, borrar'), tono: 'peligro' })) return;
    const r = await MEITI.fetchMutante(base + '?ecosistema=' + eco + '&id=' + fila.id, { method: 'DELETE' });
    if (r && r.ok === false) { setAviso('No se pudo borrar. Vuelve a intentarlo.'); return; }
    cargar();
  };

  const abrirEdicion = (fila) => {
    setEditando(fila);
    setForma({ titulo: fila.titulo || '', cuerpo: fila.cuerpo || '', tono: fila.tono || 'neutro' });
    setAbierto(true);
  };

  const deLaSeccion = filas.filter(f => (f.seccion || 'ayuda') === pestana);
  const visibles = pestana === 'ayuda'
    ? deLaSeccion.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : deLaSeccion.slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));

  const fechaLegible = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
    if (!m) return '';
    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return Number(m[3]) + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[1];
  };

  const TONOS = [
    { value: 'neutro', label: MEITI.t('note_input', null, 'Nota') },
    { value: 'exito', label: MEITI.t('update_input', null, 'Actualización') },
    { value: 'alerta', label: MEITI.t('notice_input', null, 'Aviso') },
    { value: 'peligro', label: MEITI.t('error_input', null, 'Error') }
  ];
  const nombreDelTono = (t) => (TONOS.find(x => x.value === (t || 'neutro')) || TONOS[0]).label;

  const filaAyuda = (f) => (
    <div key={f.id} style={{ border: '1px solid ' + tema.colorPrimario + '22', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <strong style={{ color: tema.texto }}>{f.titulo}</strong>
        {soyAdmin && (
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            <UI.Boton variante="fantasma" ariaLabel={MEITI.t('edit_action', null, "Editar")} onClick={() => abrirEdicion(f)}><i className="fa-solid fa-pen-to-square"></i></UI.Boton>
            <UI.Boton variante="fantasma-peligro" ariaLabel={MEITI.t('delete_action', null, "Borrar")} onClick={() => borrar(f)}><i className="fa-solid fa-trash-can"></i></UI.Boton>
          </div>
        )}
      </div>
      {f.cuerpo && <p style={{ color: tema.texto, opacity: 0.8, marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{f.cuerpo}</p>}
    </div>
  );

  const filaBitacora = (f) => (
    <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', borderBottom: '1px solid ' + tema.colorPrimario + '18', padding: '0.6rem 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <UI.Chip tono={f.tono || 'neutro'}>{nombreDelTono(f.tono)}</UI.Chip>
          <strong style={{ color: tema.texto }}>{f.titulo}</strong>
        </div>
        {f.cuerpo && <p style={{ color: tema.texto, opacity: 0.75, marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{f.cuerpo}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <span style={{ color: tema.texto, opacity: 0.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{fechaLegible(f.fecha)}</span>
        {soyAdmin && <UI.Boton variante="fantasma-peligro" ariaLabel={MEITI.t('delete_action', null, "Borrar")} onClick={() => borrar(f)}><i className="fa-solid fa-trash-can"></i></UI.Boton>}
      </div>
    </div>
  );

  return (
    <UI.Tarjeta>
      <h3 style={{ color: tema.texto, fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{MEITI.t('configuration_title', null, "Configuración")}</h3>
      <p style={{ color: tema.texto, opacity: 0.6, fontSize: '0.75rem', marginBottom: '1rem' }}>{MEITI.t('app_guide_description', null, "Cómo se usa esta app, y qué le fue pasando.")}</p>

      {aviso && <UI.Aviso mensaje={aviso} tono="alerta" onCerrar={() => setAviso(null)} />}

      <UI.Pestanas
        pestanas={[{ id: 'ayuda', titulo: MEITI.t('help_title', null, 'Ayuda'), icono: 'fa-circle-question' }, { id: 'bitacora', titulo: MEITI.t('changelog_title', null, 'Bitácora'), icono: 'fa-clock-rotate-left' }]}
        activa={pestana}
        onCambio={(id) => { setPestana(id); cerrarFormulario(); }}
        className="mb-4"
      />

      {cargando ? (
        <p style={{ color: tema.texto, opacity: 0.6 }}>{MEITI.t('loading', null, "Cargando...")}</p>
      ) : visibles.length === 0 ? (
        <UI.EstadoVacio
          icono={pestana === 'ayuda' ? 'fa-book-open' : 'fa-clock-rotate-left'}
          mensaje={pestana === 'ayuda'
            ? (soyAdmin ? 'Todavía no hay guía de uso. Escribe la primera sección y quien entre después va a saber cómo usar la app.' : 'Todavía no hay una guía para esta app.')
            : 'Todavía no hay nada anotado. Acá van a aparecer las actualizaciones, los avisos y los errores de esta app.'}
        />
      ) : pestana === 'ayuda' ? (
        <div>{visibles.map(filaAyuda)}</div>
      ) : (
        <UI.ListaScrollable alto="26rem">{visibles.map(filaBitacora)}</UI.ListaScrollable>
      )}

      {soyAdmin && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid ' + tema.colorPrimario + '22' }}>
          {!abierto ? (
            <UI.Boton variante="secundario" onClick={() => setAbierto(true)}>
              <i className="fa-solid fa-plus"></i> {pestana === 'ayuda' ? 'Agregar una sección a la guía' : 'Anotar en la bitácora'}
            </UI.Boton>
          ) : (
            <div>
              <UI.Campo
                etiqueta={pestana === 'ayuda' ? 'Título de la sección' : 'Qué pasó'}
                valor={forma.titulo}
                onChange={(e) => setForma({ ...forma, titulo: e.target.value })}
                placeholder={pestana === 'ayuda' ? 'Cómo dar de alta un cliente' : 'Se actualizó el catálogo de precios'}
              />
              <div style={{ height: '0.75rem' }} />
              <UI.Campo
                etiqueta={pestana === 'ayuda' ? 'Explicación' : 'Detalle (opcional)'}
                tipo="textarea"
                filas={4}
                valor={forma.cuerpo}
                onChange={(e) => setForma({ ...forma, cuerpo: e.target.value })}
                placeholder={pestana === 'ayuda' ? 'Explícalo como se lo explicarías a alguien que abre la app por primera vez' : 'Qué se cambió y por qué'}
              />
              {pestana === 'bitacora' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <UI.Campo etiqueta={MEITI.t('type_input', null, "Tipo")} tipo="select" valor={forma.tono} onChange={(e) => setForma({ ...forma, tono: e.target.value })} opciones={TONOS} />
                </div>
              )}
              <div style={{ height: '0.75rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <UI.Boton onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</UI.Boton>
                <UI.Boton variante="secundario" onClick={cerrarFormulario}>{MEITI.t('cancel_button', null, "Cancelar")}</UI.Boton>
              </div>
            </div>
          )}
        </div>
      )}
    </UI.Tarjeta>
  );
};

export default TablerosNorte_muugzt8s__Configuracion;
