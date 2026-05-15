const oracledb = require('oracledb');

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || '12345',
      connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1'
    });

    console.log('Conectado a Oracle DB');

    // Intentar añadir la columna USUARIO_ID_USU a la tabla GUARDIAN
    try {
      await connection.execute(`ALTER TABLE GUARDIAN ADD USUARIO_ID_USU NUMBER`);
      console.log('Columna USUARIO_ID_USU añadida a GUARDIAN');
    } catch (e) {
      if (e.message.includes('ORA-01430') || e.message.includes('already exists')) {
        console.log('La columna USUARIO_ID_USU ya existe.');
      } else {
        console.warn('Error al añadir columna:', e.message);
      }
    }

    // Añadir FK si no existe
    try {
      await connection.execute(`ALTER TABLE GUARDIAN ADD CONSTRAINT FK_GUARDIAN_USUARIO FOREIGN KEY (USUARIO_ID_USU) REFERENCES USUARIO(ID_USU)`);
      console.log('Constraint FK_GUARDIAN_USUARIO añadida');
    } catch (e) {
      console.log('No se pudo añadir FK (posiblemente ya existe):', e.message);
    }

    await connection.commit();
  } catch (err) {
    console.error('Error de conexión:', err.message);
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

run();
