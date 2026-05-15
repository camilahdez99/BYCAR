import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getConnection } from '@/lib/db';

/**
 * GET: Obtener viajes donde el usuario es el guardián (contacto de confianza)
 * o el estado de su propio guardián activo.
 */
export async function GET(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const usuarioId = searchParams.get('usuarioId');

    connection = await getConnection();

    if (email) {
      // Buscar alertas para este guardián
      const sql = `
        SELECT g.ID_GUA as "id", 
               g.EMAIL_CONFIANZA_GUA as "email",
               g.TIEMPO_ESTIMADO_MIN_GUA as "tiempo",
               g.ESTADO_VIAJE_GUA as "estado",
               TO_CHAR(g.FECHA_INICIO_GUA, 'YYYY-MM-DD HH24:MI:SS') as "inicio",
               v.MUNICIPIO_ORIGEN_VIA as "origen",
               v.MUNICIPIO_DESTINO_VIA as "destino",
               u.NOMBRE_USU || ' ' || u.APELLIDO_USU as "pasajero",
               vh.PLACA_VEH as "placa",
               vh.MARCA_VEH as "carro",
               cond_u.NOMBRE_USU || ' ' || cond_u.APELLIDO_USU as "conductor"
        FROM GUARDIAN g
        JOIN VIAJE v ON g.ID_VIA = v.ID_VIA
        JOIN USUARIO u ON g.USUARIO_ID_USU = u.ID_USU
        JOIN VEHICULO vh ON v.VEHICULO_PLACA_VEH = vh.PLACA_VEH
        JOIN CONDUCTOR c ON v.CONDUCTOR_ID_CON = c.ID_CON
        JOIN USUARIO cond_u ON c.USUARIO_ID_USU = cond_u.ID_USU
        WHERE UPPER(g.EMAIL_CONFIANZA_GUA) = UPPER(:email) AND g.ESTADO_VIAJE_GUA != 'FINALIZADO'

      `;
      const result = await connection.execute(sql, { email });
      return NextResponse.json(result.rows || [], { status: 200 });
    }

    if (usuarioId) {
      // Buscar el guardián activo del propio usuario
      const sql = `
        SELECT ID_GUA as "id", ESTADO_VIAJE_GUA as "estado", TIEMPO_ESTIMADO_MIN_GUA as "tiempo"
        FROM GUARDIAN
        WHERE USUARIO_ID_USU = :usuarioId AND ESTADO_VIAJE_GUA != 'FINALIZADO'
      `;
      const result = await connection.execute(sql, { usuarioId });
      return NextResponse.json(result.rows[0] || null, { status: 200 });
    }

    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  } catch (error) {
    console.error('Error en GET Guardian:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}

/**
 * POST: Activar un nuevo guardián para un viaje
 */
export async function POST(req) {
  let connection;
  try {
    const { viajeId, usuarioId, email, tiempo } = await req.json();

    if (!viajeId || !usuarioId || !email || !tiempo) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    connection = await getConnection();
    
    // Validar que el correo del contacto exista en la plataforma (insensible a mayúsculas)
    const checkUserSql = `SELECT ID_USU FROM USUARIO WHERE UPPER(CORREO_USU) = UPPER(:email)`;
    const userRes = await connection.execute(checkUserSql, { email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'El correo de contacto no corresponde a un usuario registrado en BYCAR' }, { status: 404 });
    }

    const idGua = Date.now();
    console.log('Activando Guardián:', { idGua, viajeId, usuarioId, email, tiempo });

    const sql = `
      INSERT INTO GUARDIAN (ID_GUA, ID_VIA, USUARIO_ID_USU, EMAIL_CONFIANZA_GUA, TIEMPO_ESTIMADO_MIN_GUA, ESTADO_VIAJE_GUA, FECHA_INICIO_GUA)
      VALUES (:idGua, :viajeId, :usuarioId, :email, :tiempo, 'INICIADO', CURRENT_TIMESTAMP)
    `;

    await connection.execute(sql, { 
      idGua: Number(idGua), 
      viajeId: Number(viajeId), 
      usuarioId: Number(usuarioId), 
      email, 
      tiempo: Number(tiempo) 
    }, { autoCommit: true });




    return NextResponse.json({ message: 'Guardián activado', id: idGua }, { status: 201 });
  } catch (error) {
    console.error('Error en POST Guardian:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}

/**
 * PUT: Actualizar estado o reajustar tiempo
 */
export async function PUT(req) {
  let connection;
  try {
    const { id, estado, extraTiempo } = await req.json();

    connection = await getConnection();

    if (extraTiempo) {
      const sql = `UPDATE GUARDIAN SET TIEMPO_ESTIMADO_MIN_GUA = TIEMPO_ESTIMADO_MIN_GUA + :extraTiempo WHERE ID_GUA = :id`;
      await connection.execute(sql, { extraTiempo, id }, { autoCommit: true });
      return NextResponse.json({ message: 'Tiempo reajustado' });

    }

    if (estado) {
      const sql = `UPDATE GUARDIAN SET ESTADO_VIAJE_GUA = :estado WHERE ID_GUA = :id`;
      await connection.execute(sql, { estado, id }, { autoCommit: true });
      return NextResponse.json({ message: 'Estado actualizado' });

    }

    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  } catch (error) {
    console.error('Error en PUT Guardian:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}
