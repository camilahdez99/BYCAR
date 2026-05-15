const oracledb = require('oracledb');

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || '12345',
      connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1'
    });

    console.log('--- COLUMNAS USUARIO ---');
    const cols = await connection.execute(`SELECT column_name FROM user_tab_cols WHERE table_name = 'USUARIO'`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(cols.rows);

    console.log('--- DATOS USUARIO (Primeros 5) ---');
    const data = await connection.execute(`SELECT ID_USU, CORREO_USU FROM USUARIO FETCH FIRST 5 ROWS ONLY`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(data.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) {}
    }
  }
}

run();
