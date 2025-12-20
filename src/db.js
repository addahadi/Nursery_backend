import postgres from 'postgres';

let sql;

if (!global._sql) {
  const connectionString = 'postgresql://postgres.amkfgkrfdoynyjhrvtyh:Missoumadda1234@aws-1-eu-west-3.pooler.supabase.com:6543/postgres'


  console.log('Using connection string:', connectionString); // debug

  global._sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  console.log('Database connection pool created');
}

sql = global._sql;

export default sql;
