"use client"
import { toast } from 'react-hot-toast';
import { Check, X } from 'lucide-react';

/**
 * PermisosManager
 * UI para asignar y revocar menús a perfiles mediante la tabla PERMISOS.
 * Utiliza los endpoints ya creados en /api/admin/permisos y los existentes para PERFILES y MENUS.
 */
export default function PermisosManager() {
  const [perfiles, setPerfiles] = useState([]); // [{ id, nombre }]
  const [menus, setMenus] = useState([]); // [{ id, label, url, parentId }]
  const [selectedPerfil, setSelectedPerfil] = useState(null);
  const [asignados, setAsignados] = useState([]); // array de menuId
  const [loading, setLoading] = useState(true);

  // Cargar perfiles y menús al montar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resPerf, resMen] = await Promise.all([
          fetch('/api/admin/tablas?tabla=PERFILES'), // lista de perfiles
          fetch('/api/menus'), // lista de menús pública
        ]);
        const perfData = await resPerf.json();
        const menData = await resMen.json();
        setPerfiles(perfData);
        setMenus(menData);
      } catch (e) {
        console.error(e);
        toast.error('Error al cargar perfiles o menús');
      }
    };
    cargarDatos();
  }, []);

  // Cuando cambie el perfil seleccionado, obtener sus permisos
  useEffect(() => {
    if (!selectedPerfil) return;
    const cargarPermisos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/permisos?perfilId=${selectedPerfil}`);
        const data = await res.json();
        // La API devuelve objetos con menuId; extraemos solo los IDs
        const ids = data.map((p) => p.menuId);
        setAsignados(ids);
      } catch (e) {
        console.error(e);
        toast.error('Error al cargar permisos del perfil');
      } finally {
        setLoading(false);
      }
    };
    cargarPermisos();
  }, [selectedPerfil]);

  const toggleMenu = async (menuId) => {
    if (!selectedPerfil) return;
    const yaAsignado = asignados.includes(menuId);
    const endpoint = '/api/admin/permisos';
    try {
      if (yaAsignado) {
        // Revocar
        const url = `${endpoint}?perfilId=${selectedPerfil}&menuId=${menuId}`;
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al revocar permiso');
        setAsignados(asignados.filter((id) => id !== menuId));
        toast.success('Permiso revocado');
      } else {
        // Asignar
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfilId: selectedPerfil, menuId }),
        });
        if (!res.ok) throw new Error('Error al asignar permiso');
        setAsignados([...asignados, menuId]);
        toast.success('Permiso asignado');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Error de red');
    }
  };

  return (
    <div className="bg-[#111] rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Gestión de permisos</h2>
      {/* Selector de perfil */}
      <select
        value={selectedPerfil || ''}
        onChange={(e) => setSelectedPerfil(e.target.value)}
        className="w-full bg-white/5 text-white rounded p-2 mb-6"
      >
        <option value="" disabled>Selecciona un perfil</option>
        {perfiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre || `Perfil ${p.id}`}
          </option>
        ))}
      </select>

      {/* Lista de menús */}
      {selectedPerfil && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {menus.map((m) => (
            <label
              key={m.id}
              className="flex items-center p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10"
            >
              <input
                type="checkbox"
                className="custom-checkbox mr-3"
                checked={asignados.includes(m.id)}
                onChange={() => toggleMenu(m.id)}
                disabled={loading}
              />
              <span className="text-white">{m.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
