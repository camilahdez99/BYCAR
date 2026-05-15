import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// SELECT - Obtener todos los vehículos con datos del conductor
export async function GET(req) {
  let connection;
  try {
    connection = await getConnection();
    const sql = `
      SELECT veh.PLACA_VEH as "placa", 
             veh.MARCA_VEH as "marca", 
             veh.MODELO_VEH as "modelo", 
             veh.COLOR_VEH as "color",
             veh.CAPACIDAD_VEH as "capacidad",
             veh.CONDUCTOR_ID_CON as "idConductor",
             u.NOMBRE_USU || ' ' || u.APELLIDO_USU as "conductor"
      FROM VEHICULO veh
      JOIN CONDUCTOR c ON veh.CONDUCTOR_ID_CON = c.ID_CON
      JOIN USUARIO u ON c.USUARIO_ID_USU = u.ID_USU
      ORDER BY veh.MARCA_VEH ASC
    `;
    const result = await connection.execute(sql);
    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    return NextResponse.json({ error: 'Error al obtener vehículos' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

// INSERT - Registrar un nuevo vehículo
export async function POST(req) {
  let connection;
  try {
    const { placa, marca, modelo, color, capacidad, idConductor } = await req.json();

    if (!placa || !marca || !color || !capacidad || !idConductor) {
      return NextResponse.json({ error: 'Todos los campos obligatorios deben ser proporcionados' }, { status: 400 });
    }

    if (placa.length > 6) {
      return NextResponse.json({ error: 'La placa no puede tener más de 6 caracteres' }, { status: 400 });
    }

    connection = await getConnection();

    const checkCon = await connection.execute(
      `SELECT ID_CON FROM CONDUCTOR WHERE ID_CON = :id`, { id: idConductor }
    );
    if (!checkCon.rows || checkCon.rows.length === 0) {
      return NextResponse.json({ error: 'El conductor no existe' }, { status: 404 });
    }

    const sql = `
      INSERT INTO VEHICULO (PLACA_VEH, MARCA_VEH, MODELO_VEH, COLOR_VEH, CAPACIDAD_VEH, CONDUCTOR_ID_CON)
      VALUES (:placa, :marca, :modelo, :color, :capacidad, :idConductor)
    `;
    await connection.execute(
      sql,
      { placa: placa.toUpperCase(), marca: marca.toUpperCase(), modelo: modelo || null, color: color.toUpperCase(), capacidad: parseInt(capacidad), idConductor },
      { autoCommit: true }
    );

    return NextResponse.json({ message: 'Vehículo registrado exitosamente', placa }, { status: 201 });
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    if (error.message && error.message.includes('PK_VEHICULO')) {
      return NextResponse.json({ error: 'Ya existe un vehículo con esa placa' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear vehículo: ' + error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

// UPDATE - Actualizar datos del vehículo
export async function PUT(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const placa = searchParams.get('placa');
    const { marca, modelo, color, capacidad } = await req.json();

    if (!placa) return NextResponse.json({ error: 'Placa requerida' }, { status: 400 });
    if (!marca || !color || !capacidad) {
      return NextResponse.json({ error: 'Marca, color y capacidad son obligatorios' }, { status: 400 });
    }

    connection = await getConnection();
    const sql = `
      UPDATE VEHICULO 
      SET MARCA_VEH = :marca, MODELO_VEH = :modelo, COLOR_VEH = :color, CAPACIDAD_VEH = :capacidad 
      WHERE PLACA_VEH = :placa
    `;
    await connection.execute(
      sql,
      { placa, marca: marca.toUpperCase(), modelo: modelo || null, color: color.toUpperCase(), capacidad: parseInt(capacidad) },
      { autoCommit: true }
    );

    return NextResponse.json({ message: 'Vehículo actualizado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar vehículo:', error);
    return NextResponse.json({ error: 'Error al actualizar vehículo' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

// DELETE - Eliminar vehículo y dependencias
export async function DELETE(req) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const placa = searchParams.get('placa');

    if (!placa) return NextResponse.json({ error: 'Placa requerida' }, { status: 400 });

    connection = await getConnection();

    await connection.execute(`DELETE FROM GUARDIAN WHERE ID_VIA IN (SELECT ID_VIA FROM VIAJE WHERE VEHICULO_PLACA_VEH = :placa)`, { placa });
    await connection.execute(`DELETE FROM SOLICITUD WHERE VIAJE_ID_VIA IN (SELECT ID_VIA FROM VIAJE WHERE VEHICULO_PLACA_VEH = :placa)`, { placa });
    await connection.execute(`DELETE FROM VIAJE WHERE VEHICULO_PLACA_VEH = :placa`, { placa });
    await connection.execute(`DELETE FROM VEHICULO WHERE PLACA_VEH = :placa`, { placa }, { autoCommit: true });

    return NextResponse.json({ message: 'Vehículo eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    return NextResponse.json({ error: 'Error al eliminar vehículo: ' + error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}
