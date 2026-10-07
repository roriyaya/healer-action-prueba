import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__EN_CalendarioTarjetas = ({ datos, tema, UI, MEITI }) => {
  const [tarjetas, setTarjetas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaRef, setFechaRef] = useState(new Date());
  const [error, setError] = useState(null);

  const eco = MEITI.obtenerEcosistemaActual();
  const uid = MEITI.obtenerUsuarioActual();

  const cargarDatos = async () => {
    setCargando(true);
    const [resT, resP] = await Promise.all([
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}`)
    ]);
    if (resT.ok) setTarjetas(resT.registros);
    else setError(resT.error || MEITI.t('err_load_cards', null, 'Error al cargar tarjetas.'));
    if (resP.ok) setProyectos(resP.registros);
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const irADetalle = async (tarjeta) => {
    await MEITI.mutar(`/api/boveda/${MEITI.obtenerTabla('en_ui_estado')}?ecosistema=${eco}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'estado_' + uid, usuario_id: uid, tarjeta_activa_id: tarjeta.id })
    }, {
      alLograr: () => MEITI.irAPagina('detalle_tarjeta'),
      alFallar: () => MEITI.irAPagina('detalle_tarjeta')
    });
  };

  const mesActual = fechaRef.getMonth();
  const anioActual = fechaRef.getFullYear();
  const primerDia = new Date(anioActual, mesActual, 1);
  const ultimoDia = new Date(anioActual, mesActual + 1, 0);

  const dias = [];
  let diaSemana = primerDia.getDay();
  let offset = diaSemana === 0 ? 6 : diaSemana - 1;

  for (let i = offset; i > 0; i--) {
    dias.push(new Date(anioActual, mesActual, 1 - i));
  }
  for (let i = 1; i <= ultimoDia.getDate(); i++) {
    dias.push(new Date(anioActual, mesActual, i));
  }
  const diasFaltantes = 42 - dias.length;
  for (let i = 1; i <= diasFaltantes; i++) {
    dias.push(new Date(anioActual, mesActual + 1, i));
  }

  const mesNombre = fechaRef.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const cambiarMes = (delta) => {
    setFechaRef(new Date(anioActual, mesActual + delta, 1));
  };

  const formatearFecha = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError(null)} />
      <UI.Tarjeta className="flex flex-col flex-1 min-h-0">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Iconos.CalendarDays size={24} color={tema.colorPrimario} />
            <h2 className="text-xl font-bold capitalize" style={{color: tema.texto}}>{mesNombre}</h2>
          </div>
          <div className="flex gap-2">
            <UI.Boton variante="secundario" onClick={() => cambiarMes(-1)} ariaLabel={MEITI.t('prev_month', null, 'Mes anterior')}><Iconos.ChevronLeft size={18} /></UI.Boton>
            <UI.Boton variante="secundario" onClick={() => setFechaRef(new Date())}>{MEITI.t('today', null, 'Hoy')}</UI.Boton>
            <UI.Boton variante="secundario" onClick={() => cambiarMes(1)} ariaLabel={MEITI.t('next_month', null, 'Mes siguiente')}><Iconos.ChevronRight size={18} /></UI.Boton>
          </div>
        </div>

        {cargando ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <UI.Etiqueta>{MEITI.t('loading_calendar', null, 'Cargando calendario...')}</UI.Etiqueta>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-[500px] border rounded-xl overflow-hidden" style={{borderColor: tema.texto + '22'}}>
            <div className="grid grid-cols-7 border-b" style={{borderColor: tema.texto + '22', backgroundColor: tema.texto + '0D'}}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} className="p-2 text-center font-bold text-sm" style={{color: tema.texto}}>{d}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 bg-transparent">
              {dias.map((dia, i) => {
                const esMesActual = dia.getMonth() === mesActual;
                const esHoy = formatearFecha(dia) === formatearFecha(new Date());
                const fechaStr = formatearFecha(dia);
                const tarjetasDia = tarjetas.filter(t => t.fecha_limite && t.fecha_limite.startsWith(fechaStr));

                return (
                  <div key={i} className="border-r border-b p-1 md:p-2 flex flex-col gap-1 overflow-y-auto min-h-0" style={{
                    borderColor: tema.texto + '11',
                    backgroundColor: esMesActual ? tema.superficie : tema.fondo,
                    opacity: esMesActual ? 1 : 0.5
                  }}>
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${esHoy ? 'text-white' : ''}`} style={{
                        backgroundColor: esHoy ? tema.colorPrimario : 'transparent',
                        color: esHoy ? '#fff' : tema.texto
                      }}>
                        {dia.getDate()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {tarjetasDia.map(t => {
                        const p = proyectos.find(x => x.id === t.proyecto_id);
                        const color = p?.color || tema.colorPrimario;
                        return (
                          <Animacion.motion.div
                            key={t.id}
                            initial={{opacity: 0, scale: 0.9}}
                            animate={{opacity: 1, scale: 1}}
                            onClick={() => irADetalle(t)}
                            className="text-[10px] md:text-xs p-1 px-2 rounded cursor-pointer truncate font-semibold transition-transform hover:scale-105"
                            style={{
                              backgroundColor: color + '22',
                              color: color,
                              borderLeft: `3px solid ${color}`
                            }}
                            title={t.titulo}
                          >
                            {t.titulo}
                          </Animacion.motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </UI.Tarjeta>
    </div>
  );
};

export default TablerosNorte_muugzt8s__EN_CalendarioTarjetas;
