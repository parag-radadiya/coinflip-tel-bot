import bs58 from 'bs58';
import fs from 'fs';

try {
  // Read the keypair file content as a string
  const keypairString = fs.readFileSync('devnet-admin-wallet.json', 'utf-8');
  // Parse the string content into a JavaScript array
  const keypairArray = JSON.parse(keypairString);
  // Ensure it's an array of numbers
  if (!Array.isArray(keypairArray) || !keypairArray.every(num => typeof num === 'number')) {
    throw new Error('Invalid keypair file format. Expected a JSON array of numbers.');
  }
  // Convert the JavaScript array to a Uint8Array
  const privateKeyBytes = Uint8Array.from(keypairArray);
  // Encode the entire keypair array (which includes the public key) using bs58
  const base58PrivateKey = bs58.encode(privateKeyBytes);
  console.log(base58PrivateKey);
} catch (error) {
  console.error('Error converting key:', error.message);
  process.exit(1);
}
