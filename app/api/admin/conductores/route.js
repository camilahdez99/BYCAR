import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// SELECT - Obtener todos los conductores con datos del usuario
export async function GET(req) {
  let connection;
  try {
    connection = await getConnection();
    const sql = `
      SELECT c.ID_CON as "id", 
             u.ID_USU as "idUsuario",
             u.NOMBRE_USU as "nombre", 
             u.APELLIDO_USU as "apellido", 
             u.CORREO_USU as "correo",
             (SELECT COUNT(*) FROM VEHICULO v WHERE v.CONDUCTOR_ID_CON = c.ID_CON) as "totalVehiculos",
             (SELECT COUNT(*) FROM VIAJE vi WHERE vi.CONDUCTOR_ID_CON = c.ID_CON) as "totalViajes"
      FROM CONDUCTOR c
      JOIN USUARIO u ON c.USUARIO_ID_USU = u.ID_USU
      ORDER BY u.NOMBRE_USU ASC
    `;
    const result = await connection.execute(sql);
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error al obtener conductores:', error);
    return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

// INSERT - Registrar un nuevo conductor (asociar usuario existente)
export async function POST(req) {
  let connection;
  try {
    const { idUsuario } = await req.json();

    if (!idUsuario) {
      return NextResponse.json({ error: 'El ID del usuario es obligatorio' }, { status: 400 });
    }

    connection = await getConnection();

    // Verificar que el usuario existe
    const checkUser = await connection.execute(
      `SELECT ID_USU FROM USUARIO WHERE ID_USU = :id`, { id: idUsuario }
    );
    if (!checkUser.rows || checkUser.rows.length === 0) {
      return NextResponse.json({ error: 'El usuario no existe' }, { status: 404 });
    }

    // Verificar que el usuario no sea ya conductor
    const checkCon = await connection.execute(
      `SELECT ID_CON FROM CONDUCTOR WHERE USUARIO_ID_USU = :id`, { id: idUsuario }
    );
    if (checkCon.rows && checkCon.rows.length > 0) {
      return NextResponse.json({ error: 'Este usuario ya es conductor' }, { status: 409 });
    }

    // Obtener siguiente ID
    const seqResult = await connection.execute(`SELECT NVL(MAX(ID_CON), 0) + 1 as "nextId" FROM CONDUCTOR`);
    const nextId = seqResult.rows[0].nextId;

    const sql = `INSERT INTO CONDUCTOR (ID_CON, USUARIO_ID_USU) VALUES (:id, :idUsuario)`;
    await connection.execute(sql, { id: nextId, idUsuario }, { autoCommit: true });

    return NextResponse.json({ message: 'Conductor registrado exitosamente', id: nextId }, { status: 201 });
  } catch (error) {
    console.error('Error al crear conductor:', error);
    return NextResponse.json({ error: 'Error al crear conductor: ' + error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

// UPDATE - Reasignar conductor a otro usuario
export async function PUT(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { idUsuario } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID del conductor requerido' }, { status: 400 });
    if (!idUsuario) return NextResponse.json({ error: 'ID del usuario requerido' }, { status: 400 });

    connection = await getConnection();
    const sql = `UPDATE CONDUCTOR SET USUARIO_ID_USU = :idUsuario WHERE ID_CON = :id`;
    await connection.execute(sql, { id, idUsuario }, { autoCommit: true });

    return NextResponse.json({ message: 'Conductor actualizado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar conductor:', error);
    return NextResponse.json({ error: 'Error al actualizar conductor' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

// DELETE - Eliminar conductor (cascade eliminará vehículos y viajes)
export async function DELETE(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    connection = await getConnection();

    await connection.execute(`DELETE FROM GUARDIAN WHERE ID_VIA IN (SELECT ID_VIA FROM VIAJE WHERE CONDUCTOR_ID_CON = :id)`, { id });
    await connection.execute(`DELETE FROM SOLICITUD WHERE VIAJE_ID_VIA IN (SELECT ID_VIA FROM VIAJE WHERE CONDUCTOR_ID_CON = :id)`, { id });
    await connection.execute(`DELETE FROM MENSAJE WHERE CONDUCTOR_ID_CON = :id`, { id });
    await connection.execute(`DELETE FROM VIAJE WHERE CONDUCTOR_ID_CON = :id`, { id });
    await connection.execute(`DELETE FROM VEHICULO WHERE CONDUCTOR_ID_CON = :id`, { id });
    await connection.execute(`DELETE FROM CONDUCTOR WHERE ID_CON = :id`, { id }, { autoCommit: true });

    return NextResponse.json({ message: 'Conductor eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar conductor:', error);
    return NextResponse.json({ error: 'Error al eliminar conductor: ' + error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
