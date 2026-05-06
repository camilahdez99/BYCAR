import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function POST(req) {
  let connection;
  try {
    const { nombre, apellido, correo, contrasena } = await req.json();

    if (!nombre || !apellido || !correo || !contrasena) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    connection = await getConnection();

    // Generar un ID único simple para el usuario (en un entorno real se usaría secuencias de Oracle)
    const idUsu = Date.now();

    const sql = `
      INSERT INTO USUARIO (ID_USU, NOMBRE_USU, APELLIDO_USU, CORREO_USU, CONTRASENA_USU)
      VALUES (:idUsu, :nombre, :apellido, :correo, :contrasena)
    `;

    const binds = {
      idUsu,
      nombre,
      apellido,
      correo,
      contrasena
    };

    await connection.execute(sql, binds, { autoCommit: true });

    return NextResponse.json({ message: 'Usuario registrado correctamente', id: idUsu }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return NextResponse.json({ error: 'Error interno del servidor o el correo ya existe' }, { status: 500 });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}
