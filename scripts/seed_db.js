const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || '12345',
      connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1'
    });

    console.log('Conectado a Oracle DB.');

    // Leer el archivo seed_3fn.sql
    const sqlPath = path.join(__dirname, 'seed_3fn.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('No se encontró el archivo seed_3fn.sql en scripts/');
      return;
    }

    const content = fs.readFileSync(sqlPath, 'utf-8');
    
    // Separar por punto y coma, filtrando comentarios y líneas vacías
    const statements = content
      .split(';')
      .map(st => st.trim())
      .filter(st => {
        if (!st) return false;
        // Evitar comandos SQL Developer de control
        if (st.toUpperCase().startsWith('COMMIT')) return false;
        return true;
      });

    console.log(`Se encontraron ${statements.length} sentencias SQL para ejecutar.`);

    for (let st of statements) {
      // Limpiar comentarios de la sentencia
      const cleanSt = st
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join(' ')
        .trim();

      if (!cleanSt) continue;

      try {
        await connection.execute(cleanSt);
        console.log(`ÉXITO: ${cleanSt.substring(0, 50)}...`);
      } catch (err) {
        if (err.message.includes('ORA-00001') || err.message.includes('unique constraint') || err.message.includes('already exists')) {
          console.log(`IGNORADO (Ya existe): ${cleanSt.substring(0, 50)}...`);
        } else {
          console.error(`ERROR ejecutando: ${cleanSt}\nDetalle: ${err.message}`);
        }
      }
    }

    console.log('\n¡Base de datos sembrada e inicializada con éxito!');

  } catch (err) {
    console.error('Error general:', err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

run();
