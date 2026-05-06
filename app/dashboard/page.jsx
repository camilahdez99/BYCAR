'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { MUNICIPIOS } from '@/lib/municipios';

const normalizar = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
};

const Autocomplete = ({ placeholder, value, onChange }) => {
  const [filtered, setFiltered] = useState([]);
  const [show, setShow] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = normalizar(e.target.value);
    onChange(val);
    if (val.length > 0) {
      setFiltered(MUNICIPIOS.filter(m => m.includes(val)));
      setShow(true);
    } else {
      setShow(false);
    }
  };

  const handleSelect = (m) => {
    onChange(m);
    setShow(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input 
        type="text" 
        placeholder={placeholder} 
        className="search-input" 
        value={value} 
        onChange={handleChange} 
        onFocus={() => { if(value) setShow(true) }}
        onBlur={() => {
          setTimeout(() => setShow(false), 200);
        }}
        required
      />
      {show && filtered.length > 0 && (
        <ul style={{ 
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, 
          background: '#1a1a1a', border: '1px solid var(--border)', 
          borderRadius: '14px', zIndex: 100, listStyle: 'none', 
          padding: '8px', margin: 0, maxHeight: '200px', 
          overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          {filtered.map(m => (
            <li 
              key={m} 
              onMouseDown={() => handleSelect(m)} 
              style={{ 
                padding: '10px 14px', cursor: 'pointer', borderRadius: '8px',
                fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
                transition: 'all 0.2s'
              }} 
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(229,34,34,0.1)';
                e.target.style.color = 'var(--red)';
              }} 
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState('inicio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detallesModalOpen, setDetallesModalOpen] = useState(false);
  const [viajeDetalle, setViajeDetalle] = useState(null);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatData, setChatData] = useState({ name: '', avatar: '', chatId: null });
  const [currentChatMsgs, setCurrentChatMsgs] = useState([]);
  const [msgInput, setMsgInput] = useState('');

  const [currentUser, setCurrentUser] = useState(null);
  const [mensajes, setMensajes] = useState([]);

  // --- ESTADO PARA BÚSQUEDA ---
  const [searchParams, setSearchParams] = useState({ origen: '', destino: '' });
  const [resultados, setResultados] = useState([]);
  const [solicitados, setSolicitados] = useState([]);

  // --- ESTADO PARA GESTIÓN DE RUTAS Y SOLICITUDES ---
  const [rutasPublicadas, setRutasPublicadas] = useState([]);
  const [rutasSolicitadas, setRutasSolicitadas] = useState([]);
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);

  // --- ESTADO PARA LA NUEVA RUTA ---
  const [nuevaRuta, setNuevaRuta] = useState({
    origen: '', destino: '', carro: '', placa: '', fecha: '', puestos: '', valor: '', comentarios: ''
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      let storedUser = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) storedUser = JSON.parse(userStr);
        setCurrentUser(storedUser);
      } catch(e) {}

      try {
        const uIdChat = storedUser ? (storedUser.ID_USU || storedUser.id_usu || storedUser.id) : null;
        if (!uIdChat) return;

        const [resRutas, resSol, resMensajes] = await Promise.all([
          fetch(`/api/viajes/mis-rutas?usuarioId=${uIdChat}`),
          fetch(`/api/solicitudes/recibidas?usuarioId=${uIdChat}`),
          fetch(`/api/mensajes/chats?usuarioId=${uIdChat}`)
        ]);
        if (resRutas.ok) {
          const dataRutas = await resRutas.json();
          setRutasPublicadas((dataRutas.publicadas || []).sort((a, b) => b.id - a.id));
          setRutasSolicitadas((dataRutas.solicitadas || []).sort((a, b) => b.id - a.id));
        }
        if (resSol.ok) {
          const dataSol = await resSol.json();
          setSolicitudesRecibidas(dataSol || []);
        }
        if (resMensajes && resMensajes.ok) {
          const dataMensajes = await resMensajes.json();
          setMensajes(dataMensajes || []);
        }
      } catch (error) {
        console.error('Error al cargar datos del dashboard', error);
      }
    };
    fetchDashboardData();
  }, []);

  // Re-fetch data when opening tabs or periodically
  useEffect(() => {
    if (!currentUser) return;
    const uId = currentUser.ID_USU || currentUser.id_usu || currentUser.id;

    const refreshTabs = () => {
      // Refresh solicitudes
      if (activePage === 'solicitudes') {
        fetch(`/api/solicitudes/recibidas?usuarioId=${uId}`)
          .then(res => res.json())
          .then(data => setSolicitudesRecibidas(data || []))
          .catch(err => console.error(err));
      }
      
      // Refresh mis rutas
      if (activePage === 'mis-rutas') {
        fetch(`/api/viajes/mis-rutas?usuarioId=${uId}`)
          .then(res => res.json())
          .then(data => {
            setRutasPublicadas((data.publicadas || []).sort((a, b) => b.id - a.id));
            setRutasSolicitadas((data.solicitadas || []).sort((a, b) => b.id - a.id));
          })
          .catch(err => console.error(err));
      }

      // Refresh chat list (Mensajes)
      if (activePage === 'mensajes') {
        fetch(`/api/mensajes/chats?usuarioId=${uId}`)
          .then(res => res.json())
          .then(data => setMensajes(data || []))
          .catch(err => console.error(err));
      }
    };

    refreshTabs();
    const interval = setInterval(refreshTabs, 10000); // Polling cada 10s para ver nuevos estados/chats
    return () => clearInterval(interval);
  }, [activePage, currentUser]);

  const formatCurrency = (value) => {
    const cleanValue = value.replace(/\D/g, "");
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'valor') {
      setNuevaRuta({ ...nuevaRuta, [name]: formatCurrency(value) });
    } else {
      setNuevaRuta({ ...nuevaRuta, [name]: value.toUpperCase() });
    }
  };

  const fetchChatMsgs = async (chatId) => {
    if (!chatId) return;
    try {
      const res = await fetch(`/api/mensajes?chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        const myId = currentUser?.ID_USU || currentUser?.id_usu || currentUser?.id;
        const formatted = data.map(m => ({
          sender: m.senderId == myId ? 'me' : 'other',
          text: m.text
        }));
        setCurrentChatMsgs(formatted);
      }
    } catch (error) {
      console.error('Error fetching chat', error);
    }
  };

  useEffect(() => {
    let interval;
    if (chatOpen && chatData.chatId) {
      fetchChatMsgs(chatData.chatId);
      interval = setInterval(() => {
        fetchChatMsgs(chatData.chatId);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [chatOpen, chatData.chatId]);

  const enviarMensajeChat = async () => {
    if (!msgInput.trim() || !chatData.chatId) return;
    const myId = currentUser?.ID_USU || currentUser?.id_usu || currentUser?.id;
    
    // Add locally immediately for fast UI
    const newMsg = { sender: 'me', text: msgInput.trim() };
    setCurrentChatMsgs([...currentChatMsgs, newMsg]);
    setMsgInput('');

    try {
      await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatData.chatId,
          senderId: myId,
          text: newMsg.text
        })
      });
    } catch (e) {
      console.error('Error enviando mensaje', e);
    }
  };

  const buscarViajes = async () => {
    const toastId = toast.loading('Buscando viajes...');
    try {
      const url = new URL('/api/viajes', window.location.origin);
      if (searchParams.origen) url.searchParams.append('origen', searchParams.origen);
      if (searchParams.destino) url.searchParams.append('destino', searchParams.destino);
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok) {
        setResultados(data);
        toast.success(`Se encontraron ${data.length} viajes`, { id: toastId });
      } else {
        toast.error('Error al buscar viajes', { id: toastId });
        setResultados([]);
      }
    } catch (error) {
      toast.error('Error de conexión', { id: toastId });
      setResultados([]);
    }
  };

  const solicitarViaje = async (id) => {
    const toastId = toast.loading('Enviando solicitud...');
    try {
      const uId = currentUser?.ID_USU || currentUser?.id_usu || currentUser?.id || 1;
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: id, usuarioId: uId })
      });
      if (res.ok) {
        setSolicitados([...solicitados, id]);
        toast.success('Solicitud enviada al conductor', { id: toastId });
      } else {
        toast.error('Error al enviar solicitud', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  const guardarRuta = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Publicando tu ruta...');
    
    try {
      const uId = currentUser?.ID_USU || currentUser?.id_usu || currentUser?.id || 1;
      const res = await fetch('/api/viajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevaRuta, usuarioId: uId })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const nueva = {
          id: data.id,
          ...nuevaRuta
        };
        setRutasPublicadas([...rutasPublicadas, nueva]);
        setIsModalOpen(false);
        setNuevaRuta({ origen: '', destino: '', carro: '', placa: '', fecha: '', puestos: '', valor: '', comentarios: '' });
        toast.success('Ruta publicada correctamente', { id: toastId });
      } else {
        toast.error(data.error || 'Error al publicar', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  const gestionarSolicitud = async (id, estado) => {
    const toastId = toast.loading(estado === 'Aceptado' ? 'Aceptando solicitud...' : 'Rechazando solicitud...');
    try {
      const res = await fetch('/api/solicitudes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: id, estado })
      });
      if (res.ok) {
        setSolicitudesRecibidas(solicitudesRecibidas.filter(s => s.id !== id));
        toast.success(`Solicitud ${estado.toLowerCase()}`, { id: toastId });
        
        // Refresh chat list immediately if accepted
        if (estado === 'Aceptado') {
          const uId = currentUser?.ID_USU || currentUser?.id_usu || currentUser?.id;
          if (uId) {
            fetch(`/api/mensajes/chats?usuarioId=${uId}`)
              .then(r => r.json())
              .then(data => setMensajes(data || []));
          }
        }
      } else {
        toast.error('Error al actualizar solicitud', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  const aceptarSolicitud = (id) => gestionarSolicitud(id, 'Aceptado');
  const rechazarSolicitud = (id) => gestionarSolicitud(id, 'Rechazado');

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'mis-rutas', label: 'Mis rutas', icon: 'M3 12h18M3 6h18M3 18h18' },
    { id: 'solicitudes', label: 'Solicitudes', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8z', badge: solicitudesRecibidas.length },
    { id: 'mensajes', label: 'Mensajes', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
    { id: 'guardian', label: 'Guardián', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }
  ];

  return (
    <div className="dashboard-container">
      <style jsx global>{`
        :root {
          --red: #E52222;
          --red-dark: #c01a1a;
          --bg: #0d0d0d;
          --surface: #111;
          --card: rgba(255,255,255,.04);
          --border: rgba(255,255,255,.08);
          --text: #fff;
          --muted: rgba(255,255,255,.5);
        }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }
        .dashboard-container { display: flex; min-height: 100vh; flex-direction: row; }
        .sidebar { width: 260px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
        .mobile-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1px solid var(--border); height: 65px; z-index: 1000; justify-content: space-around; align-items: center; padding: 0 10px; }
        .mobile-item { display: flex; flex-direction: column; align-items: center; color: var(--muted); gap: 4px; font-size: 0.65rem; cursor: pointer; flex: 1; }
        .mobile-item.active { color: var(--red); }
        .s-logo { display: flex; align-items: center; gap: 8px; padding: 1.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem; }
        .nav-item { display: flex; align-items: center; gap: .75rem; padding: .75rem 1.5rem; color: var(--muted); cursor: pointer; border-left: 3px solid transparent; transition: 0.2s; }
        .nav-item:hover, .nav-item.active { color: #fff; background: rgba(255,255,255,.04); border-left-color: var(--red); }
        .nav-item.active { color: var(--red); }
        main { flex: 1; padding: 2.5rem; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .page-header h1 { font-family: 'Syne', sans-serif; font-size: 1.8rem; margin: 0; }
        .route-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; transition: 0.2s; }
        .btn-red { background: var(--red); color: #fff; border: none; padding: 0.7rem 1.4rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; }
        .btn-red:disabled { background: #333; color: var(--muted); cursor: not-allowed; }
        .badge-status { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; }
        .Aceptado { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
        .Pendiente { background: rgba(250, 204, 21, 0.1); color: #facc15; }
        .search-input { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 12px; color: #fff; outline: none; text-transform: uppercase; font-size: 0.85rem; transition: all 0.2s; }
        .search-input:focus { border-color: var(--red); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 2px rgba(229,34,34,0.1); }
        .uppercase-input { text-transform: uppercase; }
        
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-nav { display: flex; }
          main { padding: 1.5rem 1rem 5rem 1rem; }
          .page-header { flex-direction: column; gap: 1rem; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .route-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .route-card div:last-child { width: 100%; display: flex; justify-content: flex-end; }
        }
      `}</style>
      
      <div className="mobile-nav">
        {navItems.map((item) => (
          <div key={item.id} className={`mobile-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
            <div style={{ position: 'relative' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={item.icon} /></svg>
              {item.badge > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: 'var(--red)', color: '#fff', borderRadius: '10px', padding: '1px 5px', fontSize: '0.6rem' }}>{item.badge}</span>}
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="s-logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
          <svg width="28" height="20" viewBox="0 0 40 26" fill="none"><rect x="2" y="10" width="36" height="12" rx="3" fill="#E52222"/><circle cx="10" cy="22" r="4" fill="#0d0d0d" stroke="#fff" strokeWidth="1.5"/><circle cx="30" cy="22" r="4" fill="#0d0d0d" stroke="#fff" strokeWidth="1.5"/></svg>
          <span style={{ fontFamily: 'Syne', fontWeight: 800 }}>Bycar</span>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <div key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={item.icon} /></svg>
              {item.label}
              {item.badge > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', marginLeft: 'auto' }}>{item.badge}</span>}
            </div>
          ))}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={() => { localStorage.removeItem('user'); router.push('/'); }} 
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '10px' }}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = 'var(--muted)'}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main>
        {activePage === 'inicio' && (
          <section>
            <div className="page-header">
              <div><h1>¡Hola, {currentUser?.NOMBRE_USU || currentUser?.nombre_usu || 'Pasajero'}! 👋</h1><p style={{ color: 'var(--muted)' }}>Tu movilidad en Colombia simplificada</p></div>
            </div>
            
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'stretch' }}>
              {/* CREAR RUTA */}
              <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '32px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem' }}>
                <div style={{ width: '64px', height: '64px', background: 'rgba(229,34,34,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', marginBottom: '0.5rem' }}>
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <h3 style={{ fontFamily: 'Syne', fontSize: '1.4rem', fontWeight: 800 }}>¿Vas a conducir?</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '280px' }}>
                  Publica tu viaje, ahorra en combustible y ayuda a otros a llegar a su destino.
                </p>
                <button className="btn-red" style={{ width: '100%', maxWidth: '240px', justifyContent: 'center', padding: '1rem', marginTop: '0.5rem' }} onClick={() => setIsModalOpen(true)}>
                  Crear nueva ruta
                </button>
              </div>

              {/* BUSCAR RUTA */}
              <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '32px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.2rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </div>
                  <h3 style={{ fontFamily: 'Syne', fontSize: '1.4rem', fontWeight: 800 }}>¿Buscas un viaje?</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Autocomplete placeholder="Origen" value={searchParams.origen} onChange={(val) => setSearchParams({...searchParams, origen: val.toUpperCase()})} />
                  <Autocomplete placeholder="Destino" value={searchParams.destino} onChange={(val) => setSearchParams({...searchParams, destino: val.toUpperCase()})} />
                  <button className="btn-red" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '0.5rem' }} onClick={() => { buscarViajes(); setActivePage('buscar'); }}>
                    Buscar rutas disponibles
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'buscar' && (
          <section>
            <div className="page-header">
              <div><h1>Resultados de búsqueda</h1><p style={{ color: 'var(--muted)' }}>Viajes disponibles para tu ruta</p></div>
              <button className="btn-red" onClick={() => setActivePage('inicio')}>Volver</button>
            </div>
            <div className="resultados-lista">
              {resultados.length > 0 ? resultados.map(viaje => (
                <div className="route-card" key={viaje.id}>
                  <div>
                    <strong>{viaje.origen} → {viaje.destino}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Conductor: {viaje.conductor} • {viaje.hora}</p>
                    <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.8rem', padding: '5px 0', fontWeight: 'bold' }} onClick={() => {setViajeDetalle(viaje); setDetallesModalOpen(true)}}>Ver Detalles</button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--red)', fontWeight: '800' }}>${viaje.valor}</span><br/>
                    <button className="btn-red" style={{ padding: '6px 15px', fontSize: '0.8rem', marginTop: '8px' }} onClick={() => solicitarViaje(viaje.id)} disabled={solicitados.includes(viaje.id)}>{solicitados.includes(viaje.id) ? 'Pendiente' : 'Solicitar'}</button>
                  </div>
                </div>
              )) : <p style={{ color: 'var(--muted)' }}>No se encontraron viajes con esos criterios.</p>}
            </div>
          </section>
        )}

        {activePage === 'mis-rutas' && (
          <section>
            <div className="page-header">
              <div>
                <h1 style={{ fontFamily: 'Syne', fontWeight: 800 }}>Mis Rutas</h1>
                <p style={{ color: 'var(--muted)' }}>Gestiona tus viajes publicados y solicitudes enviadas</p>
              </div>
            </div>
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
              <div>
                <h3 style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>RUTAS PUBLICADAS</h3>
                {rutasPublicadas.map(r => (
                  <div key={r.id} className="route-card">
                    <div><strong>{r.origen} → {r.destino}</strong><p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Placa: {r.placa} • {r.fecha}</p></div>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>RUTAS SOLICITADAS</h3>
                {rutasSolicitadas.map(r => (
                  <div key={r.id} className="route-card">
                    <div><strong>{r.origen} → {r.destino}</strong><p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Conductor: {r.conductor} • {r.fecha}</p></div>
                    <span className={`badge-status ${r.estado}`}>{r.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activePage === 'solicitudes' && (
          <section>
            <div className="page-header">
              <div>
                <h1 style={{ fontFamily: 'Syne', fontWeight: 800 }}>Solicitudes Recibidas</h1>
                <p style={{ color: 'var(--muted)' }}>Gestiona quiénes viajarán contigo en tus próximas rutas</p>
              </div>
            </div>
            {solicitudesRecibidas.map(s => (
              <div key={s.id} className="route-card">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.avatar}</div>
                  <div><strong>{s.pasajero}</strong><p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Ruta: {s.ruta}</p></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => aceptarSolicitud(s.id)} style={{ background: '#4ade80', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>Aceptar</button>
                  <button onClick={() => rechazarSolicitud(s.id)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px' }}>Rechazar</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {activePage === 'mensajes' && (
          <section>
            <div className="page-header">
              <div>
                <h1 style={{ fontFamily: 'Syne', fontWeight: 800 }}>Mensajes</h1>
                <p style={{ color: 'var(--muted)' }}>Coordina los detalles del encuentro con tus compañeros de viaje</p>
              </div>
            </div>
            {mensajes.length > 0 ? mensajes.map((chat) => (
              <div key={chat.chatId} className="route-card" onClick={() => {setChatData({name: chat.nombre, avatar: chat.nombre.charAt(0), chatId: chat.chatId}); setCurrentChatMsgs([]); setChatOpen(true)}} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 45, height: 45, background: '#333', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--red)' }}>{chat.nombre.charAt(0)}</div>
                  <div><strong>{chat.nombre}</strong><p style={{ fontSize: '0.8rem', color: 'var(--red)' }}>Viaje: {chat.ruta} ({chat.fecha})</p></div>
                </div>
              </div>
            )) : <p style={{ color: 'var(--muted)' }}>No tienes chats activos de próximos viajes.</p>}
            {chatOpen && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', height: '400px', display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}><strong>Chat con {chatData.name}</strong><button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button></div>
                
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentChatMsgs.length === 0 ? (
                    <div style={{ margin: 'auto' }}>
                      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>Inicia la conversación para acordar el punto de encuentro.</p>
                    </div>
                  ) : (
                    currentChatMsgs.map((msg, i) => (
                      <div key={i} style={{ 
                        background: msg.sender === 'me' ? 'var(--red)' : '#333', 
                        color: '#fff', 
                        padding: '10px', 
                        borderRadius: '12px', 
                        maxWidth: '80%', 
                        alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start', 
                        borderBottomRightRadius: msg.sender === 'me' ? '2px' : '12px',
                        borderBottomLeftRadius: msg.sender === 'me' ? '12px' : '2px'
                      }}>
                        {msg.text}
                      </div>
                    ))
                  )}
                </div>
                
                <div style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                  <input 
                    placeholder="Escribe..." 
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') enviarMensajeChat(); }}
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', padding: '10px', borderRadius: '10px', color: '#fff', outline: 'none' }} 
                  />
                  <button className="btn-red" onClick={enviarMensajeChat}>Enviar</button>
                </div>
              </div>
            )}
          </section>
        )}

        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'var(--surface)', width: '100%', maxWidth: '550px', borderRadius: '24px', border: '1px solid var(--border)', padding: '2.5rem', position: 'relative' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              <h2 style={{ fontFamily: 'Syne', fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--red)' }}>Publicar nuevo viaje</h2>
              <form onSubmit={guardarRuta} style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Autocomplete placeholder="Origen" value={nuevaRuta.origen} onChange={(val) => setNuevaRuta({...nuevaRuta, origen: val.toUpperCase()})} />
                  <Autocomplete placeholder="Destino" value={nuevaRuta.destino} onChange={(val) => setNuevaRuta({...nuevaRuta, destino: val.toUpperCase()})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input name="carro" className="search-input" placeholder="Vehículo (Ej: MAZDA 3)" value={nuevaRuta.carro} onChange={handleInputChange} required />
                  <input name="placa" className="search-input" placeholder="Placa (Ej: XYZ123)" value={nuevaRuta.placa} onChange={handleInputChange} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input type="date" name="fecha" className="search-input" onChange={handleInputChange} required />
                  <input type="number" name="puestos" className="search-input" placeholder="Puestos" onChange={handleInputChange} required />
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}>$</span>
                  <input name="valor" className="search-input" placeholder="Valor por persona" value={nuevaRuta.valor} onChange={handleInputChange} required style={{ paddingLeft: '25px' }} />
                </div>
                <textarea name="comentarios" className="search-input" placeholder="Comentarios extras (Ej: NO MASCOTAS, MALETA PEQUEÑA...)" value={nuevaRuta.comentarios} onChange={handleInputChange} style={{ minHeight: '80px', fontFamily: 'inherit' }} />
                <button type="submit" className="btn-red" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '1rem' }}>Publicar Viaje</button>
              </form>
            </div>
          </div>
        )}

        {detallesModalOpen && viajeDetalle && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'var(--surface)', width: '100%', maxWidth: '450px', borderRadius: '24px', border: '1px solid var(--border)', padding: '2.5rem', position: 'relative' }}>
              <button onClick={() => setDetallesModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              <h2 style={{ fontFamily: 'Syne', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Detalles del Viaje</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Ruta:</span> <strong>{viajeDetalle.origen} → {viajeDetalle.destino}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Conductor:</span> <strong>{viajeDetalle.conductor}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Vehículo:</span> <strong>{viajeDetalle.carro || 'N/A'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Fecha:</span> <strong>{viajeDetalle.hora}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Puestos Disp:</span> <strong>{viajeDetalle.puestos}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Valor:</span> <strong style={{ color: 'var(--red)' }}>${viajeDetalle.valor}</strong></div>
                
                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--red)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Comentarios del conductor:</span>
                  <p style={{ color: '#fff', margin: 0, fontStyle: 'italic' }}>{viajeDetalle.comentarios || 'Sin comentarios adicionales.'}</p>
                </div>
              </div>

              <button className="btn-red" style={{ width: '100%', justifyContent: 'center', marginTop: '2rem' }} onClick={() => { setDetallesModalOpen(false); solicitarViaje(viajeDetalle.id); }} disabled={solicitados.includes(viajeDetalle.id)}>
                {solicitados.includes(viajeDetalle.id) ? 'Solicitud Pendiente' : 'Solicitar Cupo'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}