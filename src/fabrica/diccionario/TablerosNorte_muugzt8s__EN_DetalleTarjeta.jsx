import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__EN_DetalleTarjeta = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const uid = MEITI.obtenerUsuarioActual();
  
  const [tarjetaId, setTarjetaId] = useState(null);
  const [tarjeta, setTarjeta] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  
  const [nuevoCheck, setNuevoCheck] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');

  const cargar = async () => {
    setCargando(true);
    const resUi = await MEITI.fetchDatosPropios(`/api/boveda/${MEITI.obtenerTabla('en_ui_estado')}?ecosistema=${eco}`);
    if (!resUi.ok || resUi.registros.length === 0 || !resUi.registros[0].tarjeta_activa_id) {
      setCargando(false);
      return;
    }
    const tId = resUi.registros[0].tarjeta_activa_id;
    setTarjetaId(tId);

    const [resT, resP, resM, resC, resChk, resCom] = await Promise.all([
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_miembros')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_columnas')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_checklists')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_comentarios')}?ecosistema=${eco}`)
    ]);

    if (resT.ok) setTarjeta(resT.registros.find(t => t.id === tId) || null);
    if (resP.ok) setProyectos(resP.registros);
    if (resM.ok) setMiembros(resM.registros);
    if (resC.ok) setColumnas(resC.registros.sort((a,b) => a.orden - b.orden));
    if (resChk.ok) setChecklists(resChk.registros.filter(c => c.tarjeta_id === tId));
    if (resCom.ok) setComentarios(resCom.registros.filter(c => c.tarjeta_id === tId).sort((a,b) => new Date(b.fecha) - new Date(a.fecha)));
    
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardarTarjeta = async () => {
    if (!tarjeta.titulo.trim()) return setError(MEITI.t('err_title_req', null, 'El título es obligatorio.'));
    setGuardando(true);
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tarjeta)
    }, {
      alLograr: () => { setExito(MEITI.t('saved', null, 'Guardado.')); setTimeout(() => setExito(null), 3000); setGuardando(false); },
      alFallar: (err) => { setError(err); setGuardando(false); }
    });
  };

  const agregarCheck = async () => {
    if (!nuevoCheck.trim()) return;
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_checklists')}?ecosistema=${eco}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'chk_' + Date.now(), tarjeta_id: tarjetaId, texto: nuevoCheck.trim(), completado: 0 })
    }, { alLograr: () => { setNuevoCheck(''); cargar(); }, alFallar: setError });
  };

  const toggleCheck = async (chk) => {
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_checklists')}?ecosistema=${eco}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...chk, completado: chk.completado ? 0 : 1 })
    }, { alLograr: cargar, alFallar: setError });
  };

  const borrarCheck = async (id) => {
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_checklists')}?ecosistema=${eco}&id=${id}`, { method: 'DELETE' }, { alLograr: cargar, alFallar: setError });
  };

  const agregarComentario = async () => {
    if (!nuevoComentario.trim()) return;
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_comentarios')}?ecosistema=${eco}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'com_' + Date.now(), tarjeta_id: tarjetaId, autor_id: uid, texto: nuevoComentario.trim(), fecha: new Date().toISOString() })
    }, { alLograr: () => { setNuevoComentario(''); cargar(); }, alFallar: setError });
  };

  if (cargando) return <UI.Tarjeta><div className="p-8 text-center"><Iconos.LoaderCircle className="animate-spin mx-auto" size={32} color={tema.colorPrimario} /></div></UI.Tarjeta>;
  if (!tarjetaId || !tarjeta) return <UI.Tarjeta><UI.EstadoVacio icono="fa-hand-pointer" mensaje={MEITI.t('no_card_selected', null, 'Selecciona una tarjeta desde el Tablero.')} /><div className="mt-4 text-center"><UI.Boton onClick={() => MEITI.irAPagina('tablero')}>{MEITI.t('go_board', null, 'Ir al Tablero')}</UI.Boton></div></UI.Tarjeta>;

  const pctCheck = checklists.length > 0 ? Math.round((checklists.filter(c => c.completado).length / checklists.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={() => MEITI.irAPagina('tablero')} className="p-2 rounded-full hover:bg-black/5" style={{ color: tema.texto }}><Iconos.ArrowLeft size={24} /></button>
        <h2 className="text-2xl font-bold" style={{ color: tema.texto }}>{MEITI.t('card_detail', null, 'Detalle de Tarea')}</h2>
      </div>

      <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError(null)} />
      <UI.Aviso mensaje={exito} tono="exito" onCerrar={() => setExito(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <UI.Tarjeta className="flex flex-col gap-4">
            <UI.Campo etiqueta={MEITI.t('title', null, 'Título')} tipo="text" valor={tarjeta.titulo} onChange={e => setTarjeta({...tarjeta, titulo: e.target.value})} />
            <UI.Campo etiqueta={MEITI.t('desc', null, 'Descripción')} tipo="textarea" valor={tarjeta.descripcion || ''} onChange={e => setTarjeta({...tarjeta, descripcion: e.target.value})} />
            <div className="flex justify-end">
              <UI.Boton onClick={guardarTarjeta} variante="primario" disabled={guardando}><Iconos.Save size={16} className="mr-2"/> {guardando ? MEITI.t('saving', null, 'Guardando...') : MEITI.t('save', null, 'Guardar Cambios')}</UI.Boton>
            </div>
          </UI.Tarjeta>

          <UI.Tarjeta className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Iconos.ListChecks size={20} color={tema.colorSecundario} />
                <UI.Etiqueta>{MEITI.t('checklist', null, 'Lista de Tareas')}</UI.Etiqueta>
              </div>
              <span className="text-sm font-bold font-mono" style={{ color: tema.colorSecundario }}>{pctCheck}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: tema.texto + '11' }}>
              <div className="h-full transition-all duration-500" style={{ width: `${pctCheck}%`, background: tema.colorSecundario }}></div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {checklists.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5">
                  <button onClick={() => toggleCheck(c)} style={{ color: c.completado ? tema.colorSecundario : tema.texto, opacity: c.completado ? 1 : 0.5 }}>
                    {c.completado ? <Iconos.SquareCheck size={20} /> : <Iconos.Square size={20} />}
                  </button>
                  <span className="flex-1 text-sm" style={{ color: tema.texto, textDecoration: c.completado ? 'line-through' : 'none', opacity: c.completado ? 0.5 : 1 }}>{c.texto}</span>
                  <button onClick={() => borrarCheck(c.id)} className="opacity-50 hover:opacity-100 text-red-500"><Iconos.Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <UI.Campo tipo="text" valor={nuevoCheck} onChange={e => setNuevoCheck(e.target.value)} placeholder={MEITI.t('add_item', null, 'Nuevo ítem...')} accion={<UI.Boton onClick={agregarCheck} variante="secundario"><Iconos.Plus size={16}/></UI.Boton>} />
              </div>
            </div>
          </UI.Tarjeta>

          <UI.Tarjeta className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Iconos.MessageSquare size={20} color={tema.colorPrimario} />
              <UI.Etiqueta>{MEITI.t('comments', null, 'Comentarios')}</UI.Etiqueta>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <UI.Campo tipo="text" valor={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} placeholder={MEITI.t('write_comment', null, 'Escribe un comentario...')} accion={<UI.Boton onClick={agregarComentario} variante="primario"><Iconos.Send size={16}/></UI.Boton>} />
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {comentarios.length === 0 ? <UI.EstadoVacio icono="fa-comments" mensaje={MEITI.t('no_comments', null, 'No hay comentarios aún.')} /> : comentarios.map(c => {
                const autor = miembros.find(m => m.id === c.autor_id) || { nombre: 'Usuario', avatar_url: 'avatares/notion_1.png' };
                return (
                  <div key={c.id} className="flex gap-3">
                    <img src={autor.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    <div className="flex flex-col p-3 rounded-2xl rounded-tl-none" style={{ background: tema.superficie, border: `1px solid ${tema.texto}11` }}>
                      <div className="flex justify-between items-center gap-4 mb-1">
                        <span className="font-bold text-xs" style={{ color: tema.texto }}>{autor.nombre}</span>
                        <span className="text-[10px] opacity-50 font-mono" style={{ color: tema.texto }}>{new Date(c.fecha).toLocaleString()}</span>
                      </div>
                      <p className="text-sm" style={{ color: tema.texto }}>{c.texto}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </UI.Tarjeta>
        </div>

        <div className="flex flex-col gap-6">
          <UI.Tarjeta className="flex flex-col gap-4">
            <UI.Etiqueta>{MEITI.t('properties', null, 'Propiedades')}</UI.Etiqueta>
            <UI.Campo etiqueta={MEITI.t('status', null, 'Estado')} tipo="select" valor={tarjeta.columna_id} onChange={e => setTarjeta({...tarjeta, columna_id: e.target.value})} opciones={columnas.map(c => ({value: c.id, label: c.nombre}))} />
            <UI.Campo etiqueta={MEITI.t('project', null, 'Proyecto')} tipo="select" valor={tarjeta.proyecto_id} onChange={e => setTarjeta({...tarjeta, proyecto_id: e.target.value})} opciones={proyectos.map(p => ({value: p.id, label: p.nombre}))} />
            <UI.Campo etiqueta={MEITI.t('assignee', null, 'Asignado a')} tipo="select" valor={tarjeta.asignado_id || ''} onChange={e => setTarjeta({...tarjeta, asignado_id: e.target.value})} opciones={[{value:'', label:'Sin asignar'}, ...miembros.map(m => ({value: m.id, label: m.nombre}))]} />
            <UI.Campo etiqueta={MEITI.t('priority', null, 'Prioridad')} tipo="select" valor={tarjeta.prioridad} onChange={e => setTarjeta({...tarjeta, prioridad: e.target.value})} opciones={[{value:'Baja', label:'Baja'}, {value:'Media', label:'Media'}, {value:'Alta', label:'Alta'}, {value:'Urgente', label:'Urgente'}]} />
            <UI.Campo etiqueta={MEITI.t('deadline', null, 'Fecha Límite')} tipo="date" valor={tarjeta.fecha_limite || ''} onChange={e => setTarjeta({...tarjeta, fecha_limite: e.target.value})} />
            <UI.Boton onClick={guardarTarjeta} variante="secundario" disabled={guardando}>{MEITI.t('apply_props', null, 'Aplicar Propiedades')}</UI.Boton>
          </UI.Tarjeta>
        </div>
      </div>
    </div>
  );
};

export default TablerosNorte_muugzt8s__EN_DetalleTarjeta;
