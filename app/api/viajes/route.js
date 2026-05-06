import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getConnection } from '@/lib/db';

export async function GET(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const origen = searchParams.get('origen');
    const destino = searchParams.get('destino');

    connection = await getConnection();

    let sql = `
      SELECT v.ID_VIA as "id", 
             v.MUNICIPIO_ORIGEN_VIA as "origen", 
             v.MUNICIPIO_DESTINO_VIA as "destino", 
             TO_CHAR(v.TIEMPO_SALIDA_VIA, 'YYYY-MM-DD') as "hora", 
             v.COSTO_PERSONA_VIA as "valor",
             v.COMENTARIOS_VIA as "comentarios",
             v.CUPOS_DISPONIBLES_VIA as "puestos",
             u.NOMBRE_USU || ' ' || u.APELLIDO_USU as "conductor",
             vh.MARCA_VEH as "carro"
      FROM VIAJE v
      LEFT JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON
      LEFT JOIN USUARIO u ON c.USUARIO_ID_USU = u.ID_USU
      LEFT JOIN VEHICULO vh ON v.VEHICULO_PLACA_VEH = vh.PLACA_VEH
      WHERE v.ESTADO_VIA = 'Activo' AND v.TIEMPO_SALIDA_VIA >= SYSDATE - 1
    `;

    const binds = {};
    if (origen) {
      sql += ` AND LOWER(v.MUNICIPIO_ORIGEN_VIA) LIKE LOWER(:origen)`;
      binds.origen = `%${origen}%`;
    }
    if (destino) {
      sql += ` AND LOWER(v.MUNICIPIO_DESTINO_VIA) LIKE LOWER(:destino)`;
      binds.destino = `%${destino}%`;
    }

    const result = await connection.execute(sql, binds);
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

export async function POST(req) {
  let connection;
  try {
    const body = await req.json();
    const { origen, destino, carro, placa, fecha, puestos, valor, comentarios, usuarioId } = body;

    if (!origen || !destino || !placa || !fecha || !puestos || !valor || !usuarioId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Limpiar placa para que tenga máximo 6 caracteres (ej: de XYZ-123 a XYZ123)
    const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const numPuestos = parseInt(puestos, 10);

    connection = await getConnection();

    // 2. Verificar si el usuario ya es conductor
    let conductorId = null;
    const checkConductor = await connection.execute(
      `SELECT ID_CON FROM CONDUCTOR WHERE USUARIO_ID_USU = :usuarioId`,
      { usuarioId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkConductor.rows && checkConductor.rows.length > 0) {
      const row = checkConductor.rows[0];
      conductorId = row.ID_CON || row.id_con || row[0];
    } else {
      conductorId = Date.now();
      await connection.execute(
        `INSERT INTO CONDUCTOR (ID_CON, USUARIO_ID_USU) VALUES (:conductorId, :usuarioId)`,
        { conductorId, usuarioId },
        { autoCommit: true }
      );
    }

    // 3. Verificar si el vehículo existe
    const checkVehiculo = await connection.execute(
      `SELECT PLACA_VEH FROM VEHICULO WHERE PLACA_VEH = :cleanPlaca`,
      { cleanPlaca }
    );

    if (!checkVehiculo.rows || checkVehiculo.rows.length === 0) {
       await connection.execute(
         `INSERT INTO VEHICULO (PLACA_VEH, MARCA_VEH, MODELO_VEH, COLOR_VEH, CAPACIDAD_VEH, CONDUCTOR_ID_CON)
          VALUES (:cleanPlaca, :marca, :modelo, :color, :capacidad, :conductorId)`,
         { cleanPlaca, marca: carro || 'Genérico', modelo: 'N/A', color: 'N/A', capacidad: numPuestos, conductorId },
         { autoCommit: true }
       );
    }

    const idViaje = Date.now();
    const valorNum = parseFloat(String(valor).replace(/,/g, ''));

    const sql = `
      INSERT INTO VIAJE (ID_VIA, MUNICIPIO_ORIGEN_VIA, MUNICIPIO_DESTINO_VIA, TIEMPO_SALIDA_VIA, CUPOS_DISPONIBLES_VIA, COSTO_PERSONA_VIA, ESTADO_VIA, VEHICULO_PLACA_VEH, CONDUCTOR_ID_CON, COMENTARIOS_VIA)
      VALUES (:idViaje, :origen, :destino, TO_DATE(:fecha, 'YYYY-MM-DD'), :numPuestos, :valorNum, 'Activo', :cleanPlaca, :conductorId, :comentarios)
    `;

    await connection.execute(sql, { idViaje, origen, destino, fecha, numPuestos, valorNum, cleanPlaca, conductorId, comentarios: comentarios || '' }, { autoCommit: true });

    return NextResponse.json({ message: 'Viaje publicado correctamente', id: idViaje }, { status: 201 });
  } catch (error) {
    console.error('Error al publicar viaje:', error);
    return NextResponse.json({ error: 'Error BD: ' + error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
