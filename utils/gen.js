const webpush = require('web-push');
const key = webpush.generateVAPIDKeys();
console.log('Public Key:', key.publicKey);
console.log('Private Key:', key.privateKey);