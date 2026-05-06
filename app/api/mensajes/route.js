import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId'); // Esto es el ID_SOL

    if (!chatId) {
      return NextResponse.json({ error: 'Falta chatId' }, { status: 400 });
    }

    connection = await getConnection();

    // 1. Obtener passengerId y driverId de la Solicitud
    const sqlSol = `
      SELECT s.USUARIO_ID_USU as "passengerId", v.CONDUCTOR_ID_CON as "driverId"
      FROM SOLICITUD s
      JOIN VIAJE v ON s.VIAJE_ID_VIA = v.ID_VIA
      WHERE s.ID_SOL = :chatId
    `;
    const resSol = await connection.execute(sqlSol, { chatId });
    
    if (resSol.rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const { passengerId, driverId } = resSol.rows[0];

    // 2. Obtener mensajes asociados a este par
    const sqlMsgs = `
      SELECT TO_CHAR(CONTENIDO_MEN) as "content"
      FROM MENSAJE
      WHERE USUARIO_ID_USU = :passengerId AND CONDUCTOR_ID_CON = :driverId
      ORDER BY FECHA_ENVIO_MEN ASC
    `;
    const resMsgs = await connection.execute(sqlMsgs, { passengerId, driverId });

    // 3. Transformar mensajes
    const messages = (resMsgs.rows || []).map(row => {
      // El contenido guarda "SENDER_ID||Texto del mensaje"
      const contentStr = row.content || '';
      const parts = contentStr.split('||');
      const senderId = parts[0];
      const text = parts.slice(1).join('||');
      return {
        senderId: parseInt(senderId, 10),
        text
      };
    });

    return NextResponse.json(messages, { status: 200 });

  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

export async function POST(req) {
  let connection;
  try {
    const { chatId, senderId, text } = await req.json();

    if (!chatId || !senderId || !text) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    connection = await getConnection();

    // 1. Obtener passengerId y driverId de la Solicitud
    const sqlSol = `
      SELECT s.USUARIO_ID_USU as "passengerId", v.CONDUCTOR_ID_CON as "driverId"
      FROM SOLICITUD s
      JOIN VIAJE v ON s.VIAJE_ID_VIA = v.ID_VIA
      WHERE s.ID_SOL = :chatId
    `;
    const resSol = await connection.execute(sqlSol, { chatId });
    
    if (resSol.rows.length === 0) {
      return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 });
    }

    const { passengerId, driverId } = resSol.rows[0];

    // 2. Insertar mensaje (SENDER_ID||TEXT)
    const idMen = Date.now();
    const contenido = `${senderId}||${text}`;

    const sqlInsert = `
      INSERT INTO MENSAJE (ID_MEN, CONTENIDO_MEN, FECHA_ENVIO_MEN, USUARIO_ID_USU, CONDUCTOR_ID_CON)
      VALUES (:idMen, :contenido, SYSTIMESTAMP, :passengerId, :driverId)
    `;

    await connection.execute(sqlInsert, { idMen, contenido, passengerId, driverId }, { autoCommit: true });

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
