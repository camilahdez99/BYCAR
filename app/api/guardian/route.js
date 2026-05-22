import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getConnection } from '@/lib/db';

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
               es.ESTADO_EST_GUA as "estado",
               TO_CHAR(g.FECHA_INICIO_GUA, 'YYYY-MM-DD HH24:MI:SS') as "inicio",
               mo.NOMBRE_MUN as "origen",
               md.NOMBRE_MUN as "destino",
               u.NOMBRE_USU || ' ' || u.APELLIDO_USU as "pasajero",
               vh.PLACA_VEH as "placa",
               m.NOMBRE_MAR as "carro",
               u.NOMBRE_USU || ' ' || u.APELLIDO_USU as "conductor"
        FROM GUARDIANES g
        JOIN VIAJES v ON g.VIAJES_ID_VIA = v.ID_VIA
        JOIN ESTADOS_GUA es ON g.ESTADO_ID_EST = es.ID_EST_GUA
        JOIN USUARIOS u ON v.USUARIOS_ID_USU = u.ID_USU
        JOIN VEHICULOS vh ON v.VEHICULO_PLACA_VEH = vh.PLACA_VEH
        JOIN MARCAS m ON vh.MARCA_ID_MAR = m.ID_MAR
        JOIN MUNICIPIOS mo ON v.MUNICIPIO_ORIGEN_ID = mo.ID_MUN
        JOIN MUNICIPIOS md ON v.MUNICIPIOS_DESTINO_ID = md.ID_MUN
        WHERE UPPER(g.EMAIL_CONFIANZA_GUA) = UPPER(:email) AND g.ESTADO_ID_EST != 2
      `;
      // Estado 2 asume Inactivo/Finalizado según el seed script
      const result = await connection.execute(sql, { email });
      return NextResponse.json(result.rows || [], { status: 200 });
    }

    if (usuarioId) {
      // Buscar el guardián activo del propio usuario (conductor/creador del viaje)
      const sql = `
        SELECT g.ID_GUA as "id", es.ESTADO_EST_GUA as "estado"
        FROM GUARDIANES g
        JOIN VIAJES v ON g.VIAJES_ID_VIA = v.ID_VIA
        JOIN ESTADOS_GUA es ON g.ESTADO_ID_EST = es.ID_EST_GUA
        WHERE v.USUARIOS_ID_USU = :usuarioId AND g.ESTADO_ID_EST != 2
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

export async function POST(req) {
  let connection;
  try {
    const { viajeId, email } = await req.json();

    if (!viajeId || !email) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    connection = await getConnection();
    
    // Validar que el correo del contacto exista en la plataforma (insensible a mayúsculas)
    const checkUserSql = `SELECT ID_USU FROM USUARIOS WHERE UPPER(CORREO_USU) = UPPER(:email)`;
    const userRes = await connection.execute(checkUserSql, { email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'El correo de contacto no corresponde a un usuario registrado en BYCAR' }, { status: 404 });
    }

    const idGua = Date.now();

    const sql = `
      INSERT INTO GUARDIANES (ID_GUA, EMAIL_CONFIANZA_GUA, FECHA_INICIO_GUA, VIAJES_ID_VIA, ESTADO_ID_EST)
      VALUES (:idGua, :email, SYSTIMESTAMP, :viajeId, 1)
    `;
    // Estado 1 asume Activo/Iniciado

    await connection.execute(sql, { 
      idGua: Number(idGua), 
      viajeId: Number(viajeId), 
      email 
    }, { autoCommit: true });

    return NextResponse.json({ message: 'Guardián activado', id: idGua }, { status: 201 });
  } catch (error) {
    console.error('Error en POST Guardian:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}

export async function PUT(req) {
  let connection;
  try {
    const { id, estado } = await req.json();

    connection = await getConnection();

    if (estado) {
      // Mapeo básico si el frontend envía el texto en vez del ID
      const estadoMap = { 
        'Activo': 1, 'ACTIVO': 1,
        'Inactivo': 2, 'INACTIVO': 2, 'Finalizado': 2, 'FINALIZADO': 2,
        'Alerta': 3, 'ALERTA': 3
      };
      const estadoId = estadoMap[estado] !== undefined ? estadoMap[estado] : estado;

      const sql = `UPDATE GUARDIANES SET ESTADO_ID_EST = :estadoId WHERE ID_GUA = :id`;
      await connection.execute(sql, { estadoId: Number(estadoId), id }, { autoCommit: true });
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
