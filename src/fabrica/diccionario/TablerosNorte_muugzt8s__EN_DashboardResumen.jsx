import React, { useState, useEffect } from 'react';
import { LIBRERIAS_PREMIUM } from '../core/libreriasPremium.js';

const { Iconos, Animacion, Graficos } = LIBRERIAS_PREMIUM;

// 🛡️ Ladrillo Forjado por IA y Aprobado por el Pentágono (MEITI)
const TablerosNorte_muugzt8s__EN_DashboardResumen = ({ datos, tema, UI, MEITI }) => {
  const eco = MEITI.obtenerEcosistemaActual();
  const [proyectos, setProyectos] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = async () => {
    setCargando(true);
    const [resP, resT, resC] = await Promise.all([
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_proyectos')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_tarjetas')}?ecosistema=${eco}`),
      MEITI.fetchDatos(`/api/boveda/${MEITI.obtenerTabla('en_columnas')}?ecosistema=${eco}`)
    ]);
    if (resP.ok) setProyectos(resP.registros);
    if (resT.ok) setTarjetas(resT.registros);
    if (resC.ok) setColumnas(resC.registros.sort((a,b) => a.orden - b.orden));
    if (!resP.ok || !resT.ok || !resC.ok) setError(MEITI.t('err_load', null, 'Error al cargar datos.'));
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) return <UI.Tarjeta><div className="p-8 text-center"><Iconos.LoaderCircle className="animate-spin mx-auto" size={32} color={tema.colorPrimario} /></div></UI.Tarjeta>;

  const activas = tarjetas.filter(t => t.columna_id !== 'col_done');
  const completadas = tarjetas.filter(t => t.columna_id === 'col_done');
  const urgentes = activas.filter(t => t.prioridad === 'Alta' || t.prioridad === 'Urgente');

  const datosGrafico = columnas.map(c => ({
    nombre: c.nombre,
    cantidad: tarjetas.filter(t => t.columna_id === c.id).length
  }));

  return (
    <div className="flex flex-col gap-6">
      <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError(null)} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Animacion.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <UI.Tarjeta className="flex items-center gap-4">
            <div className="p-4 rounded-full" style={{ background: tema.colorPrimario + '22', color: tema.colorPrimario }}><Iconos.Briefcase size={28} /></div>
            <div>
              <UI.Etiqueta>{MEITI.t('active_projects', null, 'Proyectos Activos')}</UI.Etiqueta>
              <span className="text-3xl font-black font-mono" style={{ color: tema.texto }}>{proyectos.filter(p => p.estado === 'Activo').length}</span>
            </div>
          </UI.Tarjeta>
        </Animacion.motion.div>
        <Animacion.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <UI.Tarjeta className="flex items-center gap-4">
            <div className="p-4 rounded-full" style={{ background: tema.colorSecundario + '22', color: tema.colorSecundario }}><Iconos.ListTodo size={28} /></div>
            <div>
              <UI.Etiqueta>{MEITI.t('pending_tasks', null, 'Tareas Pendientes')}</UI.Etiqueta>
              <span className="text-3xl font-black font-mono" style={{ color: tema.texto }}>{activas.length}</span>
            </div>
          </UI.Tarjeta>
        </Animacion.motion.div>
        <Animacion.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <UI.Tarjeta className="flex items-center gap-4">
            <div className="p-4 rounded-full" style={{ background: '#ef444422', color: '#ef4444' }}><Iconos.Flame size={28} /></div>
            <div>
              <UI.Etiqueta>{MEITI.t('urgent_tasks', null, 'Tareas Urgentes')}</UI.Etiqueta>
              <span className="text-3xl font-black font-mono" style={{ color: tema.texto }}>{urgentes.length}</span>
            </div>
          </UI.Tarjeta>
        </Animacion.motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UI.Tarjeta className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Iconos.ChartColumn size={20} color={tema.colorPrimario} />
            <UI.Etiqueta>{MEITI.t('tasks_by_status', null, 'Distribución de Tareas')}</UI.Etiqueta>
          </div>
          {datosGrafico.length === 0 || tarjetas.length === 0 ? (
            <UI.EstadoVacio icono="fa-chart-simple" mensaje={MEITI.t('no_data_chart', null, 'No hay tareas para graficar.')} />
          ) : (
            <div className="w-full h-64">
              <Graficos.ResponsiveContainer width="100%" height="100%">
                <Graficos.BarChart data={datosGrafico}>
                  <Graficos.CartesianGrid strokeDasharray="3 3" stroke={tema.texto + '22'} />
                  <Graficos.XAxis dataKey="nombre" stroke={tema.texto} fontSize={12} />
                  <Graficos.YAxis stroke={tema.texto} fontSize={12} />
                  <Graficos.Tooltip contentStyle={{ backgroundColor: tema.superficie, borderColor: tema.colorPrimario + '44', color: tema.texto, borderRadius: '8px' }} />
                  <Graficos.Bar dataKey="cantidad" fill={tema.colorPrimario} radius={[4, 4, 0, 0]} />
                </Graficos.BarChart>
              </Graficos.ResponsiveContainer>
            </div>
          )}
        </UI.Tarjeta>

        <UI.Tarjeta className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Iconos.CalendarClock size={20} color={tema.colorSecundario} />
            <UI.Etiqueta>{MEITI.t('upcoming_deadlines', null, 'Próximos Vencimientos')}</UI.Etiqueta>
          </div>
          <UI.ListaScrollable alto="16rem">
            {activas.filter(t => t.fecha_limite).sort((a,b) => new Date(a.fecha_limite) - new Date(b.fecha_limite)).slice(0, 5).map(t => (
              <div key={t.id} className="p-3 mb-2 rounded-xl border flex justify-between items-center" style={{ borderColor: tema.texto + '11', background: tema.fondo }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: tema.texto }}>{t.titulo}</p>
                  <p className="text-xs opacity-70 font-mono" style={{ color: tema.texto }}>{t.fecha_limite}</p>
                </div>
                <UI.Chip tono={t.prioridad === 'Alta' ? 'peligro' : 'neutro'}>{t.prioridad}</UI.Chip>
              </div>
            ))}
            {activas.filter(t => t.fecha_limite).length === 0 && (
              <UI.EstadoVacio icono="fa-mug-hot" mensaje={MEITI.t('no_deadlines', null, 'No hay tareas con vencimiento próximo.')} />
            )}
          </UI.ListaScrollable>
        </UI.Tarjeta>
      </div>
    </div>
  );
};

export default TablerosNorte_muugzt8s__EN_DashboardResumen;
