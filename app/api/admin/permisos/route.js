import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getConnection } from '@/lib/db';

// GET — obtener permisos de un perfil (menús asignados)
export async function GET(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const perfilId = searchParams.get('perfilId');

    connection = await getConnection();

    if (perfilId) {
      // Menús asignados a un perfil específico
      const sql = `
        SELECT p.PERFIL_ID_PER as "perfilId", p.MENU_ID_ENU as "menuId",
               m.CAMPO_ENU as "menuNombre", m.URL_ENU as "menuUrl"
        FROM PERMISOS p
        JOIN MENUS m ON p.MENU_ID_ENU = m.ID_ENU
        WHERE p.PERFIL_ID_PER = :perfilId
        ORDER BY m.ID_ENU
      `;
      const result = await connection.execute(sql, { perfilId: Number(perfilId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return NextResponse.json(result.rows || [], { status: 200 });
    }

    // Todos los permisos
    const sql = `
      SELECT p.PERFIL_ID_PER as "perfilId", pf.NOMBRE_PER as "perfilNombre",
             p.MENU_ID_ENU as "menuId", m.CAMPO_ENU as "menuNombre", m.URL_ENU as "menuUrl"
      FROM PERMISOS p
      JOIN PERFILES pf ON p.PERFIL_ID_PER = pf.ID_PER
      JOIN MENUS m ON p.MENU_ID_ENU = m.ID_ENU
      ORDER BY p.PERFIL_ID_PER, m.ID_ENU
    `;
    const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error en GET /api/admin/permisos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
}

// POST — asignar un menú a un perfil
export async function POST(req) {
  let connection;
  try {
    const { perfilId, menuId } = await req.json();
    if (!perfilId || !menuId) {
      return NextResponse.json({ error: 'perfilId y menuId son requeridos' }, { status: 400 });
    }

    connection = await getConnection();
    const sql = `INSERT INTO PERMISOS (PERFIL_ID_PER, MENU_ID_ENU) VALUES (:perfilId, :menuId)`;
    await connection.execute(sql, { perfilId: Number(perfilId), menuId: Number(menuId) }, { autoCommit: true });
    return NextResponse.json({ message: 'Permiso asignado' }, { status: 201 });
  } catch (error) {
    if (error.message?.includes('ORA-00001')) {
      return NextResponse.json({ error: 'Este permiso ya existe' }, { status: 409 });
    }
    console.error('Error en POST /api/admin/permisos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
}

// DELETE — revocar un menú de un perfil
export async function DELETE(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const perfilId = searchParams.get('perfilId');
    const menuId = searchParams.get('menuId');

    if (!perfilId || !menuId) {
      return NextResponse.json({ error: 'perfilId y menuId son requeridos' }, { status: 400 });
    }

    connection = await getConnection();
    const sql = `DELETE FROM PERMISOS WHERE PERFIL_ID_PER = :perfilId AND MENU_ID_ENU = :menuId`;
    await connection.execute(sql, { perfilId: Number(perfilId), menuId: Number(menuId) }, { autoCommit: true });
    return NextResponse.json({ message: 'Permiso revocado' }, { status: 200 });
  } catch (error) {
    console.error('Error en DELETE /api/admin/permisos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
}
