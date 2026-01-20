const fs = require('fs');
const content = `DB_HOST=aws-0-us-west-2.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.ddmeodlpdxgmadduwdas
DB_PASSWORD="92li!ra$Gu2"
DB_NAME=postgres
DB_SSL=true
JWT_SECRET=fnS8JHYuYjgyKZzHDXvfzwmK0LVcE0S3jq6HFB14wu/rG+In7Lmv24K4KndjDoyRPZLKhPn7j9PAkk/rcWZq7w==
PORT=3000`; // Usando comillas dobles para password por seguridad en .env estándar

fs.writeFileSync('.env', content);
console.log('.env actualizado correctamente');
