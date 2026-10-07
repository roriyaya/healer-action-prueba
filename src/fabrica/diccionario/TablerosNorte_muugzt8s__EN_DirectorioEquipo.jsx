import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__EN_DirectorioEquipo = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const [miembros, setMiembros] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const vacio = { id: '', nombre: '', rol: 'Desarrollador', email: '', avatar_url: 'avatares/notion_1.png' };
  const [form, setForm] = useState(vacio);

  const cargar = async () => {
    setCargando(true);
    const [resM, resT] = await Promise.all([
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_miembros')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`)
    ]);
    if (resM.ok) setMiembros(resM.registros);
    if (resT.ok) setTarjetas(resT.registros);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError(MEITI.t('err_name_req', null, 'El nombre es obligatorio.'));
    const esNuevo = !form.id;
    const payload = { ...form, id: esNuevo ? 'usr_' + Date.now() : form.id };
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_miembros')}?ecosistema=${eco}`, {
      method: esNuevo ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, {
      alLograr: () => { setExito(MEITI.t('saved', null, 'Miembro guardado.')); setForm(vacio); cargar(); setTimeout(() => setExito(null), 3000); },
      alFallar: setError
    });
  };

  const borrar = async (id) => {
    if (!await MEITI.confirmar(MEITI.t('del_member_q', null, '¿Borrar este miembro? Sus tareas quedarán sin asignar.'))) return;
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_miembros')}?ecosistema=${eco}&id=${id}`, { method: 'DELETE' }, { alLograr: cargar, alFallar: setError });
  };

  const columnas = [
    { clave: 'avatar_url', etiqueta: 'Avatar', render: f => <img src={f.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border" style={{ borderColor: tema.colorPrimario + '44' }} /> },
    { clave: 'nombre', etiqueta: MEITI.t('name', null, 'Nombre'), render: f => <span className="font-bold">{f.nombre}</span> },
    { clave: 'rol', etiqueta: MEITI.t('role', null, 'Rol'), render: f => <UI.Chip tono="neutro">{f.rol}</UI.Chip> },
    { clave: 'email', etiqueta: 'Email' },
    { clave: 'carga', etiqueta: MEITI.t('workload', null, 'Tareas Activas'), render: f => {
      const count = tarjetas.filter(t => t.asignado_id === f.id && t.columna_id !== 'col_done').length;
      return <span className="font-mono font-bold" style={{ color: count > 5 ? '#ef4444' : tema.colorSecundario }}>{count}</span>;
    }}
  ];

  return (
    <div className="flex flex-col gap-6">
      <Animacion.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <UI.Tarjeta>
          <div className="flex items-center gap-2 mb-4">
            <Iconos.Users size={20} color={tema.colorPrimario} />
            <UI.Etiqueta>{form.id ? MEITI.t('edit_member', null, 'Editar Miembro') : MEITI.t('new_member', null, 'Nuevo Miembro')}</UI.Etiqueta>
          </div>
          <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError(null)} />
          <UI.Aviso mensaje={exito} tono="exito" onCerrar={() => setExito(null)} />
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex-1"><UI.Campo etiqueta={MEITI.t('name', null, 'Nombre')} tipo="text" valor={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
              <div className="flex-1"><UI.Campo etiqueta={MEITI.t('role', null, 'Rol')} tipo="select" valor={form.rol} onChange={e => setForm({...form, rol: e.target.value})} opciones={[{value:'Desarrollador', label:'Desarrollador'}, {value:'Diseñador', label:'Diseñador'}, {value:'Project Manager', label:'Project Manager'}, {value:'Marketing', label:'Marketing'}]} /></div>
              <div className="flex-1"><UI.Campo etiqueta="Email" tipo="text" valor={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="flex-1"><UI.Campo etiqueta={MEITI.t('avatar_url', null, 'URL Avatar (MEITI)')} tipo="text" valor={form.avatar_url} onChange={e => setForm({...form, avatar_url: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-2">
              <UI.Boton tipo="submit" variante="primario">{form.id ? MEITI.t('update', null, 'Actualizar') : MEITI.t('create', null, 'Crear')}</UI.Boton>
              {form.id && <UI.Boton type="button" variante="secundario" onClick={() => setForm(vacio)}>{MEITI.t('cancel', null, 'Cancelar')}</UI.Boton>}
            </div>
          </form>
        </UI.Tarjeta>
      </Animacion.motion.div>

      <UI.Tarjeta>
        <UI.Etiqueta>{MEITI.t('team_list', null, 'Directorio del Equipo')}</UI.Etiqueta>
        {cargando ? <div className="p-4 text-center"><Iconos.LoaderCircle className="animate-spin mx-auto" size={24} color={tema.colorPrimario} /></div> : miembros.length === 0 ? <UI.EstadoVacio icono="fa-users" mensaje={MEITI.t('no_members', null, 'No hay miembros en el equipo.')} /> : (
          <UI.TablaDatos columnas={columnas} datos={miembros} claveId="id" onEditar={(f) => { setForm(f); window.scrollTo({top:0, behavior:'smooth'}); }} onBorrar={(f) => borrar(f.id)} />
        )}
      </UI.Tarjeta>
    </div>
  );
};

export default TablerosNorte_muugzt8s__EN_DirectorioEquipo;
