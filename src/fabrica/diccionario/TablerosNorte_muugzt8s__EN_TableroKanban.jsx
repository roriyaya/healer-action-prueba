import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__EN_TableroKanban = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const [proyectos, setProyectos] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = async () => {
    setCargando(true);
    const [resP, resT, resC, resM] = await Promise.all([
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_columnas')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_miembros')}?ecosistema=${eco}`)
    ]);
    if (resP.ok) setProyectos(resP.registros);
    if (resT.ok) setTarjetas(resT.registros);
    if (resC.ok) setColumnas(resC.registros.sort((a,b) => a.orden - b.orden));
    if (resM.ok) setMiembros(resM.registros);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirTarjeta = async (id) => {
    const uid = MEITI.obtenerUsuarioActual();
    const url = `/api/boveda/${MEITI.obtenerTabla('en_ui_estado')}?ecosistema=${eco}`;
    await MEITI.mutar(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ui_' + uid, usuario_id: uid, tarjeta_activa_id: id })
    }, {
      alLograr: () => MEITI.irAPagina('detalle_tarjeta'),
      alFallar: setError
    });
  };

  const moverTarjeta = async (tarjeta, nuevaColId) => {
    const url = `/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`;
    await MEITI.mutar(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tarjeta, columna_id: nuevaColId })
    }, {
      alLograr: cargar,
      alFallar: setError
    });
  };

  const crearTarjetaRapida = async (colId) => {
    const titulo = prompt(MEITI.t('new_task_title', null, 'Título de la nueva tarea:'));
    if (!titulo) return;
    const url = `/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`;
    await MEITI.mutar(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'tar_' + Date.now(),
        proyecto_id: filtroProyecto || (proyectos[0]?.id || ''),
        titulo: titulo,
        columna_id: colId,
        prioridad: 'Media',
        fecha_creacion: new Date().toISOString()
      })
    }, { alLograr: cargar, alFallar: setError });
  };

  if (cargando) return <UI.Tarjeta><div className="p-8 text-center"><Iconos.LoaderCircle className="animate-spin mx-auto" size={32} color={tema.colorPrimario} /></div></UI.Tarjeta>;

  const tarjetasFiltradas = filtroProyecto ? tarjetas.filter(t => t.proyecto_id === filtroProyecto) : tarjetas;

  return (
    <div className="flex flex-col gap-4 h-full">
      <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError(null)} />
      
      <UI.Tarjeta className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Iconos.Kanban size={24} color={tema.colorPrimario} />
          <h2 className="text-xl font-bold" style={{ color: tema.texto }}>{MEITI.t('board_title', null, 'Tablero de Trabajo')}</h2>
        </div>
        <div className="w-full md:w-64">
          <UI.Desplegable 
            valor={filtroProyecto} 
            onCambio={(e) => setFiltroProyecto(e.target.value)} 
            opciones={[{value: '', label: MEITI.t('all_projects', null, 'Todos los proyectos')}, ...proyectos.map(p => ({ value: p.id, label: p.nombre }))]} 
          />
        </div>
      </UI.Tarjeta>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {columnas.map((col, idx) => {
          const tarjetasCol = tarjetasFiltradas.filter(t => t.columna_id === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-3 min-w-[280px] w-[280px] rounded-2xl p-3 shrink-0" style={{ background: tema.superficie, border: `1px solid ${tema.texto}11` }}>
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: col.color || tema.colorPrimario }}></div>
                  <span className="font-bold text-sm uppercase tracking-wider" style={{ color: tema.texto }}>{col.nombre}</span>
                </div>
                <span className="text-xs font-mono font-bold opacity-50" style={{ color: tema.texto }}>{tarjetasCol.length}</span>
              </div>
              
              <div className="flex flex-col gap-3">
                <Animacion.AnimatePresence>
                  {tarjetasCol.map(t => {
                    const asignado = miembros.find(m => m.id === t.asignado_id);
                    const proy = proyectos.find(p => p.id === t.proyecto_id);
                    return (
                      <Animacion.motion.div key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
                        <div className="p-3 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow border" style={{ background: tema.fondo, borderColor: tema.texto + '11' }} onClick={() => abrirTarjeta(t.id)}>
                          {proy && <div className="text-[10px] font-bold uppercase mb-1 opacity-70" style={{ color: proy.color || tema.colorPrimario }}>{proy.nombre}</div>}
                          <h4 className="font-semibold text-sm mb-2 leading-tight" style={{ color: tema.texto }}>{t.titulo}</h4>
                          <div className="flex justify-between items-end mt-3">
                            <div className="flex gap-1">
                              {idx > 0 && <button onClick={(e) => { e.stopPropagation(); moverTarjeta(t, columnas[idx-1].id); }} className="p-1 rounded hover:bg-black/5" style={{ color: tema.texto }}><Iconos.ChevronLeft size={16} /></button>}
                              {idx < columnas.length - 1 && <button onClick={(e) => { e.stopPropagation(); moverTarjeta(t, columnas[idx+1].id); }} className="p-1 rounded hover:bg-black/5" style={{ color: tema.texto }}><Iconos.ChevronRight size={16} /></button>}
                            </div>
                            <div className="flex items-center gap-2">
                              {t.prioridad === 'Alta' && <Iconos.Flame size={14} color="#ef4444" />}
                              {asignado && <img src={asignado.avatar_url} alt={asignado.nombre} className="w-6 h-6 rounded-full border" style={{ borderColor: tema.superficie }} title={asignado.nombre} />}
                            </div>
                          </div>
                        </div>
                      </Animacion.motion.div>
                    );
                  })}
                </Animacion.AnimatePresence>
              </div>
              
              <button onClick={() => crearTarjetaRapida(col.id)} className="mt-2 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity" style={{ color: tema.texto, border: `1px dashed ${tema.texto}33` }}>
                <Iconos.Plus size={16} /> {MEITI.t('add_card', null, 'Agregar Tarjeta')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TablerosNorte_muugzt8s__EN_TableroKanban;
