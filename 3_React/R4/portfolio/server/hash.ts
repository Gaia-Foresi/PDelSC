import bcrypt from 'bcryptjs';

async function generateHash() {
  const myPassword = 'gaia123'; // ← CAMBIÁ ESTO
  const saltRounds = 12;
  const hash = await bcrypt.hash(myPassword, saltRounds);
  console.log('\n📋 Hash generado:\n');
  console.log(hash);
  console.log('\n👆 Copiá este hash para insertarlo en la BBDD\n');
}

generateHash();