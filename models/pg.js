const url = process.env.PG_URL;

module.exports = {
    async connect() {
        if (global.connection)
            return global.connection.connect();

        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: url,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        //apenas testando a conexão
        const client = await pool.connect();
        console.log("Criou pool de conexões no PostgreSQL!");

        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);
        client.release();

        //guardando para usar sempre o mesmo
        global.connection = pool;
        return pool.connect();
    }
}