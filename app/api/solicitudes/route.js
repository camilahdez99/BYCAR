import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function POST(req) {
  let connection;
  try {
    const { viajeId, usuarioId } = await req.json();

    if (!viajeId || !usuarioId) {
      return NextResponse.json({ error: 'ID de viaje y usuario son requeridos' }, { status: 400 });
    }

    connection = await getConnection();
    const idSol = Date.now();
    
    const sql = `
      INSERT INTO SOLICITUDES (ID_SOL, FECHA_SOL, ESTADO_ID_EST, VIAJES_ID_VIA, USUARIOS_ID_USU)
      VALUES (:idSol, SYSDATE, 1, :viajeId, :usuarioId)
    `;

    await connection.execute(sql, { idSol, viajeId, usuarioId }, { autoCommit: true });

    return NextResponse.json({ message: 'Solicitud enviada', id: idSol }, { status: 201 });
  } catch (error) {
    console.error('Error al solicitar viaje:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear solicitud' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

export async function PUT(req) {
  let connection;
  try {
    const { solicitudId, estado } = await req.json();

    if (!solicitudId || !estado) {
      return NextResponse.json({ error: 'ID de solicitud y estado son requeridos' }, { status: 400 });
    }

    connection = await getConnection();
    
    let sql;
    let binds = { solicitudId };
    
    if (isNaN(estado)) {
      // Si el estado es un texto, buscar dinámicamente el ID en la BD
      sql = `
        UPDATE SOLICITUDES 
        SET ESTADO_ID_EST = (
          SELECT ID_EST_SOL 
          FROM ESTADOS_SOL 
          WHERE UPPER(SUBSTR(ESTADO_EST_SOL, 1, 6)) = UPPER(SUBSTR(:estadoStr, 1, 6))
          AND ROWNUM = 1
        )
        WHERE ID_SOL = :solicitudId
      `;
      binds.estadoStr = estado;
    } else {
      // Si el frontend ya envió el ID numérico
      sql = `UPDATE SOLICITUDES SET ESTADO_ID_EST = :estadoId WHERE ID_SOL = :solicitudId`;
      binds.estadoId = Number(estado);
    }

    await connection.execute(sql, binds, { autoCommit: true });

    return NextResponse.json({ message: 'Solicitud actualizada' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
