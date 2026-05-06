"use client";
import React, { useState, useEffect } from 'react';
import HydrationWrapper from '@/components/admin/HydrationWrapper';
import { LayoutDashboard, Users, Plus, Edit2, Trash2, Car } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminPage() {
  const [activePage, setActivePage] = useState('usuarios');
  
  const [usuarios, setUsuarios] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resUsu, resViajes] = await Promise.all([
        fetch('/api/admin/usuarios'),
        fetch('/api/admin/viajes')
      ]);
      const dataUsu = await resUsu.json();
      const dataViajes = await resViajes.json();
      setUsuarios(dataUsu || []);
      setViajes(dataViajes || []);
    } catch (error) {
      toast.error('Error al cargar datos del panel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDelete = async (id, tipo) => {
    if (!confirm(`¿Seguro que deseas eliminar este ${tipo}?`)) return;
    const toastId = toast.loading(`Eliminando ${tipo}...`);
    try {
      const res = await fetch(`/api/admin/${tipo}s?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${tipo} eliminado`, { id: toastId });
        fetchAdminData();
      } else {
        const data = await res.json();
        toast.error(data.error || `Error al eliminar ${tipo}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  const handleEdit = async (item, tipo) => {
    let newData = {};
    if (tipo === 'usuario') {
      const nuevoNombre = prompt("Nuevo nombre:", item.nombre);
      const nuevoApellido = prompt("Nuevo apellido:", item.apellido);
      const nuevoCorreo = prompt("Nuevo correo:", item.correo);
      if (nuevoNombre === null || nuevoApellido === null || nuevoCorreo === null) return;
      newData = { 
        nombre: nuevoNombre.toUpperCase(), 
        apellido: nuevoApellido.toUpperCase(), 
        correo: nuevoCorreo 
      };
    } else {
      const nuevoEstado = prompt("Nuevo estado (Activo, Completado, Cancelado):", item.estado);
      if (nuevoEstado === null) return;
      newData = { estado: nuevoEstado };
    }

    const toastId = toast.loading(`Actualizando ${tipo}...`);
    try {
      const res = await fetch(`/api/admin/${tipo}s?id=${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (res.ok) {
        toast.success(`${tipo} actualizado`, { id: toastId });
        fetchAdminData();
      } else {
        const err = await res.json();
        toast.error(err.error || `Error al actualizar ${tipo}`, { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  return (
    <HydrationWrapper>
      <div className="flex min-h-screen bg-[#0a0a0a] text-white">
        {/* SIDEBAR */}
        <aside className="w-64 bg-[#111] border-r border-white/10 p-6 hidden md:block">
          <div className="mb-8 font-extrabold text-xl text-[#E52222]">Bycar ADMIN</div>
          <nav className="space-y-2">
            <p className="text-[10px] uppercase text-white/30 font-bold ml-3 mb-2">Tablas Maestras</p>
            <button 
              onClick={() => setActivePage('overview')} 
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'overview' ? 'bg-[#E52222]' : 'hover:bg-white/5 text-white/50'}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setActivePage('usuarios')} 
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'usuarios' ? 'bg-[#E52222]' : 'hover:bg-white/5 text-white/50'}`}
            >
              <Users size={18} /> Usuarios
            </button>

            <div className="pt-4">
              <p className="text-[10px] uppercase text-white/30 font-bold ml-3 mb-2">Transacciones</p>
              <button 
                onClick={() => setActivePage('viajes')} 
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'viajes' ? 'bg-[#E52222]' : 'hover:bg-white/5 text-white/50'}`}
              >
                <Car size={18} /> Viajes Realizados
              </button>
            </div>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">
                {activePage === 'usuarios' ? 'Gestión de Usuarios' : 'Historial de Viajes'}
              </h1>
              <p className="text-white/50 text-sm">
                {activePage === 'usuarios' ? 'Administración de tablas maestras' : 'Administración de tablas transaccionales'}
              </p>
            </div>
            <div />
          </header>

          <div className="bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
            {activePage === 'usuarios' ? (
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase text-white/50">
                  <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Correo</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4">{user.nombre} {user.apellido}</td>
                      <td className="p-4 text-white/60">{user.correo}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button className="p-2 text-white/40 hover:text-white" onClick={() => handleEdit(user, 'usuario')}><Edit2 size={16} /></button>
                        <button className="p-2 text-red-500/40 hover:text-red-500" onClick={() => handleDelete(user.id, 'usuario')}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase text-white/50">
                  <tr>
                    <th className="p-4">ID Viaje</th>
                    <th className="p-4">Ruta</th>
                    <th className="p-4">Conductor / Pasajero</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {viajes.map((viaje) => (
                    <tr key={viaje.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 font-mono text-xs text-white/40">#{viaje.id}</td>
                      <td className="p-4">{viaje.ruta}</td>
                      <td className="p-4 text-sm">
                        <div className="text-white">{viaje.conductor}</div>
                        <div className="text-white/40">{viaje.pasajero}</div>
                      </td>
                      <td className="p-4 text-white/60 text-sm">{viaje.fecha}</td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${viaje.estado === 'Completado' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {viaje.estado.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button className="p-2 text-white/40 hover:text-white" onClick={() => handleEdit(viaje, 'viaje')}><Edit2 size={16} /></button>
                        <button className="p-2 text-red-500/40 hover:text-red-500" onClick={() => handleDelete(viaje.id, 'viaje')}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </HydrationWrapper>
  );
}