import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) {
      return NextResponse.json({ error: 'ID de usuario es requerido' }, { status: 400 });
    }

    connection = await getConnection();

    // Obtener chats: 
    // - Si el usuario es pasajero, trae la info del conductor
    // - Si el usuario es conductor, trae la info del pasajero
    // Ambos casos solo para solicitudes Aceptadas y viajes futuros/activos
    const sql = `
      SELECT s.ID_SOL as "chatId",
             CASE 
               WHEN s.USUARIO_ID_USU = :usuarioId THEN u_cond.NOMBRE_USU || ' ' || u_cond.APELLIDO_USU
               ELSE u_pasajero.NOMBRE_USU || ' ' || u_pasajero.APELLIDO_USU
             END as "nombre",
             v.MUNICIPIO_ORIGEN_VIA || ' - ' || v.MUNICIPIO_DESTINO_VIA as "ruta",
             TO_CHAR(v.TIEMPO_SALIDA_VIA, 'YYYY-MM-DD') as "fecha"
      FROM SOLICITUD s
      JOIN VIAJE v ON s.VIAJE_ID_VIA = v.ID_VIA
      JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON
      JOIN USUARIO u_cond ON c.USUARIO_ID_USU = u_cond.ID_USU
      JOIN USUARIO u_pasajero ON s.USUARIO_ID_USU = u_pasajero.ID_USU
      WHERE s.ESTADO_SOL = 'Aceptado'
        AND v.TIEMPO_SALIDA_VIA >= SYSDATE - 1
        AND (s.USUARIO_ID_USU = :usuarioId OR c.USUARIO_ID_USU = :usuarioId)
    `;

    const result = await connection.execute(sql, { usuarioId });
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error al obtener chats:', error);
    return NextResponse.json({ error: 'Error al obtener chats' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
