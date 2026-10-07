import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__PanelRolesPermisos = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const miId = MEITI.obtenerUsuarioActual();
  const base = '/api/boveda/' + MEITI.obtenerTabla('roles_usuarios_app');

  const [filas, setFilas] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [nuevoId, setNuevoId] = React.useState('');
  const [nuevoRol, setNuevoRol] = React.useState('lector');
  const [aviso, setAviso] = React.useState(null);

  const cargar = async () => {
    setCargando(true);
    const resultado = await MEITI.fetchDatos(base + '?ecosistema=' + eco);
    if (resultado.ok) setFilas(resultado.registros);
    setCargando(false);
  };

  React.useEffect(() => { cargar(); }, []);

  const miFila = filas.find(f => f.usuario_id === miId);
  const soyDueno = MEITI.soyDuenoDeLaApp ? MEITI.soyDuenoDeLaApp() : false;
  const soyAdmin = soyDueno || (miFila ? miFila.rol === 'admin' : filas.length === 0);
  const cuantosAdmins = filas.filter(f => f.rol === 'admin').length;

  const volverseAdmin = async () => {
    const r = await MEITI.fetchMutante(base + '?ecosistema=' + eco, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'rol_' + Date.now(), usuario_id: miId, email_visible: miId.startsWith('email_') ? miId.replace('email_', '') : miId, rol: 'admin' })
    });
    if (r && r.ok === false) { setAviso('No se pudo completar la acción. Vuelve a intentarlo.'); return; }
    cargar();
  };

  const agregarUsuario = async (e) => {
    e.preventDefault();
    if (!nuevoId.trim()) { setAviso('Falta el email del usuario.'); return; }
    const r = await MEITI.fetchMutante(base + '?ecosistema=' + eco, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'rol_' + Date.now(), usuario_id: 'email_' + nuevoId.trim().toLowerCase(), email_visible: nuevoId.trim(), rol: nuevoRol })
    });
    if (r && r.ok === false) { setAviso('No se pudo agregar el usuario. Vuelve a intentarlo.'); return; }
    setNuevoId('');
    setNuevoRol('lector');
    cargar();
  };

  const cambiarRol = async (fila, rolNuevo) => {
    if (fila.rol === 'admin' && rolNuevo !== 'admin' && cuantosAdmins <= 1) {
      setAviso('No puedes quitarle el rol de administrador al último que queda. Nombra antes a otro.');
      return;
    }
    const r = await MEITI.fetchMutante(base + '?ecosistema=' + eco, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fila.id, usuario_id: fila.usuario_id, email_visible: fila.email_visible, rol: rolNuevo })
    });
    if (r && r.ok === false) { setAviso('No se pudo cambiar el rol. Vuelve a intentarlo.'); return; }
    cargar();
  };

  const quitarUsuario = async (fila) => {
    if (fila.usuario_id === miId) { setAviso('No puedes quitarte a ti mismo.'); return; }
    if (fila.rol === 'admin' && cuantosAdmins <= 1) {
      setAviso('No puedes quitar al último administrador: la app quedaría sin nadie que pueda administrarla. Nombra antes a otro.');
      return;
    }
    if (!await MEITI.confirmar('¿Quitar a ' + (fila.email_visible || fila.usuario_id) + '?')) return;
    const r = await MEITI.fetchMutante(base + '?ecosistema=' + eco + '&id=' + fila.id, { method: 'DELETE' });
    if (r && r.ok === false) { setAviso('No se pudo quitar al usuario. Vuelve a intentarlo.'); return; }
    cargar();
  };

  const columnas = [
    {
      clave: 'usuario',
      etiqueta: MEITI.t('user_column', null, "Usuario"),
      render: (f) => (
        <span>{f.email_visible || f.usuario_id}{f.usuario_id === miId ? ' (tú)' : ''}</span>
      )
    },
    {
      clave: 'rol',
      etiqueta: MEITI.t('role_column', null, "Rol"),
      render: (f) => (
        soyAdmin && f.usuario_id !== miId ? (
          <UI.Desplegable
            tamano="compacto"
            valor={f.rol}
            onCambio={(e) => cambiarRol(f, e.target.value)}
            opciones={[{ value: 'admin', label: MEITI.t('admin_role_option', null, 'admin') }, { value: 'editor', label: MEITI.t('editor_role_option', null, 'editor') }, { value: 'lector', label: MEITI.t('reader_role_option', null, 'lector') }]}
          />
        ) : (
          <UI.Chip tono={f.rol === 'admin' ? 'exito' : f.rol === 'editor' ? 'alerta' : 'neutro'}>{f.rol}</UI.Chip>
        )
      )
    }
  ];

  const accionesExtra = soyAdmin ? [
    {
      etiqueta: MEITI.t('remove_button', null, "Quitar"),
      icono: 'fa-user-slash',
      tono: 'peligro',
      onClick: (f) => quitarUsuario(f),
      condicion: (f) => f.usuario_id !== miId
    }
  ] : [];

  return (
    <UI.Tarjeta>
      <h3 style={{color: tema.texto, marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold'}}>{MEITI.t('panel_title', null, "Roles y permisos")}</h3>
      <p style={{color: tema.texto, opacity: 0.6, fontSize: '0.75rem', marginBottom: '1rem'}}>{MEITI.t('panel_subtitle', null, "Molde base del sistema — control de acceso de esta app.")}</p>

      {aviso && <UI.Aviso mensaje={aviso} tono="alerta" onCerrar={() => setAviso(null)} />}

      {cargando ? (
        <p style={{color: tema.texto}}>{MEITI.t('loading_state', null, "Cargando...")}</p>
      ) : filas.length === 0 ? (
        <div>
          <UI.EstadoVacio icono="fa-user-shield" mensaje={MEITI.t('empty_admins_message', null, "Todavía no hay administradores en esta app.")} />
          <UI.Boton onClick={volverseAdmin}>{MEITI.t('self_promote_button', null, "Volverme administrador")}</UI.Boton>
        </div>
      ) : (
        <UI.TablaDatos
          columnas={columnas}
          datos={filas}
          claveId="id"
          accionesExtra={accionesExtra}
          advertirAccionIncompleta={false}
        />
      )}

      {soyAdmin && filas.length > 0 && (
        <form onSubmit={agregarUsuario} style={{marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: '180px'}}>
            <UI.Campo etiqueta={MEITI.t('add_user_label', null, "Agregar usuario (email)")} valor={nuevoId} onChange={(e) => setNuevoId(e.target.value)} placeholder={MEITI.t('email_placeholder', null, "persona@email.com")} />
          </div>
          <div style={{minWidth: '140px'}}>
            <UI.Campo etiqueta={MEITI.t('role_column', null, "Rol")} tipo="select" valor={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} opciones={[{value:'admin', label:MEITI.t('admin_role_option', null, 'admin')}, {value:'editor', label:MEITI.t('editor_role_option', null, 'editor')}, {value:'lector', label:MEITI.t('reader_role_option', null, 'lector')}]} />
          </div>
          <UI.Boton tipo="submit">{MEITI.t('add_button', null, "Agregar")}</UI.Boton>
        </form>
      )}
    </UI.Tarjeta>
  );
};

export default TablerosNorte_muugzt8s__PanelRolesPermisos;
