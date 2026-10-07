import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__EN_GestorProyectos = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const vacio = { id: '', nombre: '', descripcion: '', color: '#2563EB', estado: 'Activo' };
  const [form, setForm] = useState(vacio);

  const cargar = async () => {
    setCargando(true);
    const res = await MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}`);
    if (res.ok) setProyectos(res.registros);
    else setError(MEITI.t('err_load', null, 'Error al cargar proyectos.'));
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError(MEITI.t('err_name_req', null, 'El nombre es obligatorio.'));
    const esNuevo = !form.id;
    const payload = { ...form, id: esNuevo ? 'proy_' + Date.now() : form.id };
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}`, {
      method: esNuevo ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, {
      alLograr: () => { setExito(MEITI.t('saved', null, 'Proyecto guardado.')); setForm(vacio); cargar(); setTimeout(() => setExito(null), 3000); },
      alFallar: setError
    });
  };

  const borrar = async (id) => {
    if (!await MEITI.confirmar(MEITI.t('del_proj_q', null, '¿Borrar este proyecto? Se perderán sus tarjetas.'))) return;
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}&id=${id}`, { method: 'DELETE' }, { alLograr: cargar, alFallar: setError });
  };

  const columnas = [
    { clave: 'color', etiqueta: 'Color', render: f => <div className="w-6 h-6 rounded-full shadow-sm" style={{ background: f.color }}></div> },
    { clave: 'nombre', etiqueta: MEITI.t('name', null, 'Nombre'), render: f => <span className="font-bold">{f.nombre}</span> },
    { clave: 'descripcion', etiqueta: MEITI.t('desc', null, 'Descripción') },
    { clave: 'estado', etiqueta: MEITI.t('status', null, 'Estado'), render: f => <UI.Chip tono={f.estado === 'Activo' ? 'exito' : 'neutro'}>{f.estado}</UI.Chip> }
  ];

  return (
    <div className="flex flex-col gap-6">
      <Animacion.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <UI.Tarjeta>
          <div className="flex items-center gap-2 mb-4">
            <Iconos.Briefcase size={20} color={tema.colorPrimario} />
            <UI.Etiqueta>{form.id ? MEITI.t('edit_proj', null, 'Editar Proyecto') : MEITI.t('new_proj', null, 'Nuevo Proyecto')}</UI.Etiqueta>
          </div>
          <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError(null)} />
          <UI.Aviso mensaje={exito} tono="exito" onCerrar={() => setExito(null)} />
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex-1"><UI.Campo etiqueta={MEITI.t('name', null, 'Nombre')} tipo="text" valor={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
              <div className="flex-1"><UI.Campo etiqueta={MEITI.t('status', null, 'Estado')} tipo="select" valor={form.estado} onChange={e => setForm({...form, estado: e.target.value})} opciones={[{value:'Activo', label:'Activo'}, {value:'Archivado', label:'Archivado'}]} /></div>
              <div className="flex-1 md:col-span-2"><UI.Campo etiqueta={MEITI.t('desc', null, 'Descripción')} tipo="text" valor={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
              <div className="flex-1">
                <UI.Etiqueta>{MEITI.t('color', null, 'Color Identificador')}</UI.Etiqueta>
                <div className="flex gap-2 mt-2">
                  {['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777'].map(c => (
                    <button key={c} type="button" onClick={() => setForm({...form, color: c})} className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110" style={{ background: c, borderColor: form.color === c ? tema.texto : 'transparent' }}></button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <UI.Boton tipo="submit" variante="primario">{form.id ? MEITI.t('update', null, 'Actualizar') : MEITI.t('create', null, 'Crear')}</UI.Boton>
              {form.id && <UI.Boton type="button" variante="secundario" onClick={() => setForm(vacio)}>{MEITI.t('cancel', null, 'Cancelar')}</UI.Boton>}
            </div>
          </form>
        </UI.Tarjeta>
      </Animacion.motion.div>

      <UI.Tarjeta>
        <UI.Etiqueta>{MEITI.t('proj_list', null, 'Directorio de Proyectos')}</UI.Etiqueta>
        {cargando ? <div className="p-4 text-center"><Iconos.LoaderCircle className="animate-spin mx-auto" size={24} color={tema.colorPrimario} /></div> : proyectos.length === 0 ? <UI.EstadoVacio icono="fa-folder-open" mensaje={MEITI.t('no_projs', null, 'No hay proyectos creados.')} /> : (
          <UI.TablaDatos columnas={columnas} datos={proyectos} claveId="id" onEditar={(f) => { setForm(f); window.scrollTo({top:0, behavior:'smooth'}); }} onBorrar={(f) => borrar(f.id)} />
        )}
      </UI.Tarjeta>
    </div>
  );
};

export default TablerosNorte_muugzt8s__EN_GestorProyectos;
