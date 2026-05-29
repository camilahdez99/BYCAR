process.env.DB_USER = 'US_BYCAR';
process.env.DB_PASSWORD = '12345';
process.env.DB_CONNECTION_STRING = 'localhost:1521/XE';
const db = require('../lib/db');
async function run() {
  const conn = await db.getConnection();
  try {
    console.log('Agregando TIEMPO_ESTIMADO_GUA a GUARDIANES...');
    await conn.execute(`ALTER TABLE GUARDIANES ADD TIEMPO_ESTIMADO_GUA NUMBER`);
    console.log('Columna agregada exitosamente.');
  } catch (e) {
    if (e.message.includes('ORA-01430')) {
      console.log('La columna ya existe en la tabla.');
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    await conn.close();
  }
}
run();
