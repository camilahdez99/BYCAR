import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(req) {
  let connection;
  try {
    connection = await getConnection();
    const sql = `
      SELECT ID_USU as "id", NOMBRE_USU as "nombre", APELLIDO_USU as "apellido", CORREO_USU as "correo"
      FROM USUARIO
    `;
    const result = await connection.execute(sql);
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
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

    // 1. Eliminar mensajes donde el usuario es el emisor o receptor (pasajero)
    await connection.execute(`DELETE FROM MENSAJE WHERE USUARIO_ID_USU = :id`, { id });

    // 2. Eliminar mensajes donde el usuario es el conductor
    await connection.execute(`DELETE FROM MENSAJE WHERE CONDUCTOR_ID_CON IN (SELECT ID_CON FROM CONDUCTOR WHERE USUARIO_ID_USU = :id)`, { id });

    // 3. Eliminar solicitudes donde el usuario es el pasajero
    await connection.execute(`DELETE FROM SOLICITUD WHERE USUARIO_ID_USU = :id`, { id });

    // 4. Limpiar solicitudes de los viajes que este usuario ofrece como conductor
    await connection.execute(
      `DELETE FROM SOLICITUD WHERE VIAJE_ID_VIA IN (SELECT ID_VIA FROM VIAJE v JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON WHERE c.USUARIO_ID_USU = :id)`,
      { id }
    );

    // 5. Eliminar los viajes
    await connection.execute(
      `DELETE FROM VIAJE WHERE CONDUCTOR_ID_CON IN (SELECT ID_CON FROM CONDUCTOR WHERE USUARIO_ID_USU = :id)`,
      { id }
    );

    // 5. Eliminar vehículos
    await connection.execute(`DELETE FROM VEHICULO WHERE CONDUCTOR_ID_CON IN (SELECT ID_CON FROM CONDUCTOR WHERE USUARIO_ID_USU = :id)`, { id });

    // 6. Eliminar registro de conductor
    await connection.execute(`DELETE FROM CONDUCTOR WHERE USUARIO_ID_USU = :id`, { id });

    // 7. Finalmente eliminar el usuario
    const sql = `DELETE FROM USUARIO WHERE ID_USU = :id`;
    await connection.execute(sql, { id }, { autoCommit: true });

    return NextResponse.json({ message: 'Usuario y todos sus datos relacionados eliminados' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario: ' + error.message }, { status: 500 });
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
    const { nombre, apellido, correo } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    connection = await getConnection();
    const sql = `
      UPDATE USUARIO 
      SET NOMBRE_USU = :nombre, APELLIDO_USU = :apellido, CORREO_USU = :correo 
      WHERE ID_USU = :id
    `;
    await connection.execute(sql, { id, nombre, apellido, correo }, { autoCommit: true });

    return NextResponse.json({ message: 'Usuario actualizado' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
