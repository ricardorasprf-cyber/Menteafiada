const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const credsPath = path.join(__dirname, 'suas-credenciais-google.json');

if (!fs.existsSync(credsPath)) {
  console.error("❌ Arquivo 'suas-credenciais-google.json' não encontrado!");
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

console.log("E-mail da conta:", creds.client_email);
console.log("Comprimento da private_key bruta:", creds.private_key?.length);

// Normalização estrita da chave PEM
let key = creds.private_key;
key = key.replace(/\\n/g, '\n');

try {
  const parsedKey = crypto.createPrivateKey(key);
  console.log("✅ Chave privada válida e suportada pelo Node.js!");
  console.log("Tipo da chave:", parsedKey.asymmetricKeyType);
} catch (err) {
  console.error("❌ Falha no parser nativo do Node:", err.message);
  console.log("\nPrimeiras 100 caracteres da chave:");
  console.log(key.substring(0, 100));
}