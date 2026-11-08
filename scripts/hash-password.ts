import { hashPassword } from '../src/lib/crypto';
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 6) throw new Error('Defina ADMIN_PASSWORD com pelo menos 6 caracteres no ambiente local');
console.log(hashPassword(password));
