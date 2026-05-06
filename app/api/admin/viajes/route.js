import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(req) {
  let connection;
  try {
    connection = await getConnection();
    const sql = `
      SELECT v.ID_VIA as "id", 
             v.MUNICIPIO_ORIGEN_VIA || ' - ' || v.MUNICIPIO_DESTINO_VIA as "ruta", 
             TO_CHAR(v.TIEMPO_SALIDA_VIA, 'YYYY-MM-DD') as "fecha", 
             v.ESTADO_VIA as "estado",
             'N/A' as "conductor", 
             'N/A' as "pasajero"
      FROM VIAJE v
    `;
    const result = await connection.execute(sql);
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error al obtener viajes admin:', error);
    return NextResponse.json({ error: 'Error al obtener viajes' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

export async function DELETE(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    connection = await getConnection();
    
    // 1. Eliminar solicitudes asociadas al viaje
    await connection.execute(`DELETE FROM SOLICITUD WHERE VIAJE_ID_VIA = :id`, { id });
    
    // 2. Finalmente eliminar el viaje
    const sql = `DELETE FROM VIAJE WHERE ID_VIA = :id`;
    await connection.execute(sql, { id }, { autoCommit: true });

    return NextResponse.json({ message: 'Viaje y sus dependencias eliminados' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar viaje:', error);
    return NextResponse.json({ error: 'Error al eliminar viaje: ' + error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
export async function PUT(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { estado } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    connection = await getConnection();
    const sql = `UPDATE VIAJE SET ESTADO_VIA = :estado WHERE ID_VIA = :id`;
    await connection.execute(sql, { id, estado }, { autoCommit: true });

    return NextResponse.json({ message: 'Viaje actualizado' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    return NextResponse.json({ error: 'Error al actualizar viaje' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
