"use client";
import React, { useState, useEffect } from 'react';
import HydrationWrapper from '@/components/admin/HydrationWrapper';
import FormularioConductor from '@/components/admin/FormularioConductor';
import FormularioVehiculo from '@/components/admin/FormularioVehiculo';
import { LayoutDashboard, Users, Plus, Edit2, Trash2, Car, X, Search, UserCheck, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormularioUsuario({ usuarioInicial, onGuardar, onCerrar, cargando }) {
  const [form, setForm] = useState({
    nombre: usuarioInicial?.nombre || '', apellido: usuarioInicial?.apellido || '',
    correo: usuarioInicial?.correo || '', contrasena: '',
  });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onGuardar(form); };
  const ic = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#E52222] transition-colors";
  const lc = "block text-xs text-white/50 mb-1 font-medium";
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className={lc}>Nombre</label><input name="nombre" value={form.nombre} onChange={handleChange} required className={ic} placeholder="Ej: JULIANA" /></div>
        <div><label className={lc}>Apellido</label><input name="apellido" value={form.apellido} onChange={handleChange} required className={ic} placeholder="Ej: GIRALDO" /></div>
      </div>
      <div><label className={lc}>Correo Electrónico</label><input name="correo" type="email" value={form.correo} onChange={handleChange} required className={ic} placeholder="correo@ejemplo.com" /></div>
      {!usuarioInicial && (<div><label className={lc}>Contraseña</label><input name="contrasena" type="password" value={form.contrasena} onChange={handleChange} required className={ic} placeholder="••••••••" /></div>)}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 text-sm transition-colors">Cancelar</button>
        <button type="submit" disabled={cargando} className="flex-1 py-2.5 rounded-lg bg-[#E52222] hover:bg-[#c71c1c] text-white text-sm font-semibold transition-colors disabled:opacity-50">{cargando ? 'Guardando...' : (usuarioInicial ? 'Actualizar' : 'Crear Usuario')}</button>
      </div>
    </form>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 hover:bg-white/[0.07] transition-colors">
      <div className={`p-3 rounded-lg ${color}`}><Icon size={22} /></div>
      <div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-white/40">{label}</p></div>
    </div>
  );
}

export default function AdminPage() {
  const [activePage, setActivePage] = useState('overview');
  const [usuarios, setUsuarios] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState('');
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rU, rC, rV, rVi] = await Promise.all([
        fetch('/api/admin/usuarios'), fetch('/api/admin/conductores'),
        fetch('/api/admin/vehiculos'), fetch('/api/admin/viajes')
      ]);
      const [dU, dC, dV, dVi] = await Promise.all([rU.json(), rC.json(), rV.json(), rVi.json()]);
      setUsuarios(Array.isArray(dU) ? dU : []);
      setConductores(Array.isArray(dC) ? dC : []);
      setVehiculos(Array.isArray(dV) ? dV : []);
      setViajes(Array.isArray(dVi) ? dVi : []);
    } catch { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const buscar = (items, keys) => items.filter(i => keys.some(k => String(i[k] || '').toLowerCase().includes(busqueda.toLowerCase())));
  const usuF = buscar(usuarios, ['nombre','apellido','correo']);
  const conF = buscar(conductores, ['nombre','apellido','correo']);
  const vehF = buscar(vehiculos, ['placa','marca','modelo','color','conductor']);
  const viaF = buscar(viajes, ['ruta','conductor','estado']);

  const abrirModal = (tipo, item = null) => { setModalTipo(tipo); setEditando(item); setModalVisible(true); };
  const cerrarModal = () => { setModalVisible(false); setEditando(null); setModalTipo(''); };

  const handleDeleteUsuario = async (id) => {
    if (!confirm('¿Eliminar este usuario y todos sus datos asociados?')) return;
    const t = toast.loading('Eliminando...');
    try {
      const r = await fetch(`/api/admin/usuarios?id=${id}`, { method: 'DELETE' });
      r.ok ? (toast.success('Eliminado', { id: t }), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
  };

  const handleDeleteConductor = async (id) => {
    if (!confirm('¿Eliminar este conductor y sus vehículos/viajes?')) return;
    const t = toast.loading('Eliminando...');
    try {
      const r = await fetch(`/api/admin/conductores?id=${id}`, { method: 'DELETE' });
      r.ok ? (toast.success('Eliminado', { id: t }), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
  };

  const handleDeleteVehiculo = async (placa) => {
    if (!confirm('¿Eliminar este vehículo?')) return;
    const t = toast.loading('Eliminando...');
    try {
      const r = await fetch(`/api/admin/vehiculos?placa=${placa}`, { method: 'DELETE' });
      r.ok ? (toast.success('Eliminado', { id: t }), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
  };

  const handleDeleteViaje = async (id) => {
    if (!confirm('¿Eliminar este viaje?')) return;
    const t = toast.loading('Eliminando...');
    try {
      const r = await fetch(`/api/admin/viajes?id=${id}`, { method: 'DELETE' });
      r.ok ? (toast.success('Eliminado', { id: t }), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
  };

  const handleGuardarUsuario = async (formData) => {
    setGuardando(true);
    const esEdit = !!editando;
    const t = toast.loading(esEdit ? 'Actualizando...' : 'Creando...');
    try {
      const r = await fetch(esEdit ? `/api/admin/usuarios?id=${editando.id}` : '/api/admin/usuarios', {
        method: esEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      r.ok ? (toast.success(esEdit ? 'Actualizado' : 'Creado', { id: t }), cerrarModal(), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
    finally { setGuardando(false); }
  };

  const handleGuardarConductor = async (formData) => {
    setGuardando(true);
    const t = toast.loading('Registrando conductor...');
    try {
      const r = await fetch('/api/admin/conductores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      r.ok ? (toast.success('Conductor registrado', { id: t }), cerrarModal(), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
    finally { setGuardando(false); }
  };

  const handleGuardarVehiculo = async (formData) => {
    setGuardando(true);
    const esEdit = !!editando;
    const t = toast.loading(esEdit ? 'Actualizando...' : 'Registrando...');
    try {
      const url = esEdit ? `/api/admin/vehiculos?placa=${editando.placa}` : '/api/admin/vehiculos';
      const r = await fetch(url, {
        method: esEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      r.ok ? (toast.success(esEdit ? 'Actualizado' : 'Registrado', { id: t }), cerrarModal(), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
    finally { setGuardando(false); }
  };

  const handleEditarViaje = async (viaje) => {
    const ns = prompt("Nuevo estado (ACTIVO, Completado, Cancelado):", viaje.estado);
    if (!ns) return;
    const t = toast.loading('Actualizando...');
    try {
      const r = await fetch(`/api/admin/viajes?id=${viaje.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: ns })
      });
      r.ok ? (toast.success('Actualizado', { id: t }), fetchData()) : toast.error((await r.json()).error, { id: t });
    } catch { toast.error('Error', { id: t }); }
  };

  const badge = (estado) => {
    const s = estado?.toUpperCase();
    if (s === 'COMPLETADO') return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (s === 'CANCELADO') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
  };

  const pages = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, group: 'Panel' },
    { id: 'usuarios', label: 'Usuarios', icon: Users, group: 'Panel' },
    { id: 'conductores', label: 'Conductores', icon: UserCheck, group: 'Tablas' },
    { id: 'vehiculos', label: 'Vehículos', icon: Truck, group: 'Tablas' },
    { id: 'viajes', label: 'Viajes', icon: Car, group: 'Transacciones' },
  ];

  const titles = { overview: 'Dashboard General', usuarios: 'Gestión de Usuarios', conductores: 'Gestión de Conductores', vehiculos: 'Gestión de Vehículos', viajes: 'Historial de Viajes' };

  let lastGroup = '';

  return (
    <HydrationWrapper>
      {modalVisible && (
        <Modal title={modalTipo === 'usuario' ? (editando ? 'Editar Usuario' : 'Nuevo Usuario') : modalTipo === 'conductor' ? 'Nuevo Conductor' : (editando ? 'Editar Vehículo' : 'Nuevo Vehículo')} onClose={cerrarModal}>
          {modalTipo === 'usuario' && <FormularioUsuario usuarioInicial={editando} onGuardar={handleGuardarUsuario} onCerrar={cerrarModal} cargando={guardando} />}
          {modalTipo === 'conductor' && <FormularioConductor onGuardar={handleGuardarConductor} onCerrar={cerrarModal} cargando={guardando} />}
          {modalTipo === 'vehiculo' && <FormularioVehiculo vehiculoInicial={editando} onGuardar={handleGuardarVehiculo} onCerrar={cerrarModal} cargando={guardando} />}
        </Modal>
      )}

      <div className="flex min-h-screen bg-[#0a0a0a] text-white">
        <aside className="w-64 bg-[#111] border-r border-white/10 p-6 hidden md:flex flex-col">
          <div className="mb-8 font-extrabold text-xl text-[#E52222]">Bycar ADMIN</div>
          <nav className="space-y-1 flex-1">
            {pages.map(p => {
              const showGroup = p.group !== lastGroup;
              lastGroup = p.group;
              return (
                <React.Fragment key={p.id}>
                  {showGroup && <p className="text-[10px] uppercase text-white/30 font-bold ml-3 mb-1 mt-4">{p.group}</p>}
                  <button onClick={() => { setActivePage(p.id); setBusqueda(''); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-sm ${activePage === p.id ? 'bg-[#E52222] text-white' : 'hover:bg-white/5 text-white/50'}`}>
                    <p.icon size={18} /> {p.label}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">{titles[activePage]}</h1>
              <p className="text-white/40 text-sm mt-1">
                {activePage === 'overview' ? 'Resumen general del sistema' :
                 activePage === 'usuarios' ? `${usuF.length} usuario(s)` :
                 activePage === 'conductores' ? `${conF.length} conductor(es)` :
                 activePage === 'vehiculos' ? `${vehF.length} vehículo(s)` :
                 `${viaF.length} viaje(s)`}
              </p>
            </div>
            {activePage === 'usuarios' && <button onClick={() => abrirModal('usuario')} className="flex items-center gap-2 bg-[#E52222] hover:bg-[#c71c1c] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"><Plus size={16} /> Nuevo Usuario</button>}
            {activePage === 'conductores' && <button onClick={() => abrirModal('conductor')} className="flex items-center gap-2 bg-[#E52222] hover:bg-[#c71c1c] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"><Plus size={16} /> Nuevo Conductor</button>}
            {activePage === 'vehiculos' && <button onClick={() => abrirModal('vehiculo')} className="flex items-center gap-2 bg-[#E52222] hover:bg-[#c71c1c] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"><Plus size={16} /> Nuevo Vehículo</button>}
          </header>

          {/* OVERVIEW */}
          {activePage === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Usuarios" value={usuarios.length} color="bg-blue-500/10 text-blue-400" />
              <StatCard icon={UserCheck} label="Conductores" value={conductores.length} color="bg-emerald-500/10 text-emerald-400" />
              <StatCard icon={Truck} label="Vehículos" value={vehiculos.length} color="bg-purple-500/10 text-purple-400" />
              <StatCard icon={Car} label="Viajes" value={viajes.length} color="bg-amber-500/10 text-amber-400" />
            </div>
          )}

          {/* SEARCH BAR */}
          {activePage !== 'overview' && (
            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E52222] transition-colors" />
            </div>
          )}

          {/* TABLES */}
          {activePage !== 'overview' && (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
              {loading ? <div className="p-12 text-center text-white/30 text-sm">Cargando datos...</div> :

              activePage === 'usuarios' ? (
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] uppercase text-white/40 tracking-wider">
                    <tr><th className="p-4">Nombre Completo</th><th className="p-4">Correo</th><th className="p-4 text-right">Acciones</th></tr>
                  </thead>
                  <tbody>
                    {usuF.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-white/30 text-sm">No se encontraron usuarios</td></tr> :
                    usuF.map(u => (
                      <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-medium">{u.nombre} {u.apellido}</td>
                        <td className="p-4 text-white/50 text-sm">{u.correo}</td>
                        <td className="p-4"><div className="flex justify-end gap-2">
                          <button title="Editar" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors" onClick={() => abrirModal('usuario', u)}><Edit2 size={15} /></button>
                          <button title="Eliminar" className="p-2 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-colors" onClick={() => handleDeleteUsuario(u.id)}><Trash2 size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) :

              activePage === 'conductores' ? (
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] uppercase text-white/40 tracking-wider">
                    <tr><th className="p-4">ID</th><th className="p-4">Conductor</th><th className="p-4">Correo</th><th className="p-4">Vehículos</th><th className="p-4">Viajes</th><th className="p-4 text-right">Acciones</th></tr>
                  </thead>
                  <tbody>
                    {conF.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-white/30 text-sm">No se encontraron conductores</td></tr> :
                    conF.map(c => (
                      <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono text-xs text-white/30">#{c.id}</td>
                        <td className="p-4 font-medium">{c.nombre} {c.apellido}</td>
                        <td className="p-4 text-white/50 text-sm">{c.correo}</td>
                        <td className="p-4 text-center"><span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">{c.totalVehiculos}</span></td>
                        <td className="p-4 text-center"><span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">{c.totalViajes}</span></td>
                        <td className="p-4"><div className="flex justify-end gap-2">
                          <button title="Eliminar" className="p-2 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-colors" onClick={() => handleDeleteConductor(c.id)}><Trash2 size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) :

              activePage === 'vehiculos' ? (
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] uppercase text-white/40 tracking-wider">
                    <tr><th className="p-4">Placa</th><th className="p-4">Marca / Modelo</th><th className="p-4">Color</th><th className="p-4">Cap.</th><th className="p-4">Conductor</th><th className="p-4 text-right">Acciones</th></tr>
                  </thead>
                  <tbody>
                    {vehF.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-white/30 text-sm">No se encontraron vehículos</td></tr> :
                    vehF.map(v => (
                      <tr key={v.placa} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono font-bold text-[#E52222]">{v.placa}</td>
                        <td className="p-4 font-medium">{v.marca} <span className="text-white/40 text-sm">{v.modelo}</span></td>
                        <td className="p-4 text-white/60 text-sm">{v.color}</td>
                        <td className="p-4 text-center">{v.capacidad}</td>
                        <td className="p-4 text-white/50 text-sm">{v.conductor}</td>
                        <td className="p-4"><div className="flex justify-end gap-2">
                          <button title="Editar" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors" onClick={() => abrirModal('vehiculo', v)}><Edit2 size={15} /></button>
                          <button title="Eliminar" className="p-2 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-colors" onClick={() => handleDeleteVehiculo(v.placa)}><Trash2 size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) :

              /* VIAJES */
              (
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] uppercase text-white/40 tracking-wider">
                    <tr><th className="p-4">ID</th><th className="p-4">Ruta</th><th className="p-4">Conductor</th><th className="p-4">Fecha</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr>
                  </thead>
                  <tbody>
                    {viaF.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-white/30 text-sm">No se encontraron viajes</td></tr> :
                    viaF.map(v => (
                      <tr key={v.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono text-xs text-white/30">#{v.id}</td>
                        <td className="p-4 font-medium">{v.ruta}</td>
                        <td className="p-4 text-sm text-white/60">{v.conductor}</td>
                        <td className="p-4 text-sm text-white/50">{v.fecha}</td>
                        <td className="p-4"><span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${badge(v.estado)}`}>{v.estado?.toUpperCase()}</span></td>
                        <td className="p-4"><div className="flex justify-end gap-2">
                          <button title="Cambiar estado" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors" onClick={() => handleEditarViaje(v)}><Edit2 size={15} /></button>
                          <button title="Eliminar" className="p-2 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-colors" onClick={() => handleDeleteViaje(v.id)}><Trash2 size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </main>
      </div>
    </HydrationWrapper>
  );
}