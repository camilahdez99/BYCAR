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

    // 1. Rutas Publicadas (Como Conductor)
    const sqlPub = `
      SELECT v.ID_VIA as "id", 
             v.MUNICIPIO_ORIGEN_VIA as "origen",
             v.MUNICIPIO_DESTINO_VIA as "destino", 
             TO_CHAR(v.TIEMPO_SALIDA_VIA, 'YYYY-MM-DD') as "fecha", 
             v.VEHICULO_PLACA_VEH as "placa",
             v.ESTADO_VIA as "estado"
      FROM VIAJE v
      JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON
      WHERE c.USUARIO_ID_USU = :usuarioId
    `;
    const resPub = await connection.execute(sqlPub, { usuarioId: Number(usuarioId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    // 2. Rutas Solicitadas (Como Pasajero)
    const sqlSol = `
      SELECT s.ID_SOL as "id",
             v.ID_VIA as "viajeId",
             v.MUNICIPIO_ORIGEN_VIA as "origen",
             v.MUNICIPIO_DESTINO_VIA as "destino",
             TO_CHAR(v.TIEMPO_SALIDA_VIA, 'YYYY-MM-DD') as "fecha",
             u_cond.NOMBRE_USU || ' ' || u_cond.APELLIDO_USU as "conductor",
             s.ESTADO_SOL as "estado",
             v.VEHICULO_PLACA_VEH as "placa",
             vh.MARCA_VEH as "carro"
      FROM SOLICITUD s

      JOIN VIAJE v ON s.VIAJE_ID_VIA = v.ID_VIA
      JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON
      JOIN USUARIO u_cond ON c.USUARIO_ID_USU = u_cond.ID_USU
      LEFT JOIN VEHICULO vh ON v.VEHICULO_PLACA_VEH = vh.PLACA_VEH
      WHERE s.USUARIO_ID_USU = :usuarioId
    `;
    const resSol = await connection.execute(sqlSol, { usuarioId: Number(usuarioId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });


    return NextResponse.json({ 
      publicadas: resPub.rows || [],
      solicitadas: resSol.rows || []
    }, { status: 200 });

  } catch (error) {
    console.error('Error al obtener mis rutas:', error);
    return NextResponse.json({ error: 'Error al obtener rutas' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
