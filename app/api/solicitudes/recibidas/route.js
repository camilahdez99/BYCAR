import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getConnection } from '@/lib/db';

export async function GET(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) {
      return NextResponse.json({ error: 'Falta usuarioId' }, { status: 400 });
    }

    connection = await getConnection();
    const sql = `
      SELECT s.ID_SOL as "id", 
             u.NOMBRE_USU || ' ' || u.APELLIDO_USU as "pasajero", 
             v.MUNICIPIO_ORIGEN_VIA || ' -> ' || v.MUNICIPIO_DESTINO_VIA as "ruta",
             'U' as "avatar"
      FROM SOLICITUD s
      JOIN VIAJE v ON s.VIAJE_ID_VIA = v.ID_VIA
      JOIN USUARIO u ON s.USUARIO_ID_USU = u.ID_USU
      JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON
      WHERE s.ESTADO_SOL = 'Pendiente' 
        AND c.USUARIO_ID_USU = :usuarioId
    `;
    
    // Convertir usuarioId a número para asegurar compatibilidad en Oracle
    const result = await connection.execute(sql, { usuarioId: Number(usuarioId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    const solicitudes = result.rows || [];
    return NextResponse.json(solicitudes, { status: 200 });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
