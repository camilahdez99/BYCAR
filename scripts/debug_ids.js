const oracledb = require('oracledb');

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || '12345',
      connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1'
    });

    console.log('--- TABLA VIAJE (ID_VIA) ---');
    const viajes = await connection.execute(`SELECT ID_VIA, MUNICIPIO_ORIGEN_VIA FROM VIAJE ORDER BY ID_VIA DESC FETCH FIRST 5 ROWS ONLY`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(viajes.rows, null, 2));

    console.log('--- TABLA SOLICITUD (ID_SOL vs VIAJE_ID_VIA) ---');
    const sols = await connection.execute(`SELECT ID_SOL, VIAJE_ID_VIA, ESTADO_SOL FROM SOLICITUD ORDER BY ID_SOL DESC FETCH FIRST 5 ROWS ONLY`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(sols.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

run();
