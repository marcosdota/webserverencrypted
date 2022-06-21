const express = require('express');
const app = express();
const http = require('http').Server(app);
//const io = require('socket.io')(http);
const rsaWrapper = require('./components/rsa-wrapper');
const aesWrapper = require('./components/aes-wrapper');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const session = require('express-session');
const { store, sessionCleanup } = require('./middlewares/sessions');
const block = require('./middlewares/blockDownloads');

require('dotenv').config();
const rotas = require('./routes');

//app.use(cors());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
  //cookie: { maxAge: 10000 },
  resave: false,
  saveUninitialized: false,
  store
}));
app.use(express.json());
app.use(rotas);
console.log(store);

//Gera nova chave pública e privada para o Servidor
//rsaWrapper.generate('server');
//Carrega chave pública e privada do Servidor
rsaWrapper.initLoadServerKeys(__dirname);
//rsaWrapper.serverExampleEncrypt();
//Carrega chave pública serializada para envio
//serverPub = fs.readFileSync(path.resolve(__dirname, 'keys', 'server.public.pem'),{ encoding: "utf8" });


// middleware for static processing
app.use(express.static(__dirname + '/static'));
app.use('/uploads', block.blockRoute, express.static(path.join(__dirname, 'uploads')));
//app.use(express.static(__dirname + '/uploads'));



/*
// web socket connection event
io.on('connection', function(socket){

    // Test sending to client dummy RSA message
    let encrypted = rsaWrapper.encrypt(rsaWrapper.clientPub, 'Hello RSA message from client to server');
    socket.emit('rsa server encrypted message', encrypted);

    // Test accepting dummy RSA message from client
    socket.on('rsa client encrypted message', function (data) {
        console.log('Server received RSA message from client');
        console.log('Encrypted message is', '\n', data);
        console.log('Decrypted message', '\n', rsaWrapper.decrypt(rsaWrapper.serverPrivate, data));
    });

    // Test AES key sending
    const aesKey = aesWrapper.generateKey();
    let encryptedAesKey = rsaWrapper.encrypt(rsaWrapper.clientPub, (aesKey.toString('base64')));
    socket.emit('send key from server to client', encryptedAesKey);

    // Test accepting dummy AES key message
    socket.on('aes client encrypted message', function (data) {
        // console.log('Server received AES message from client', '\n', 'Encrypted message is', '\n', data);
        console.log('Decrypted message', '\n', aesWrapper.decrypt(aesKey, data));

        // Test send client dummy AES message
        let message = aesWrapper.createAesMessage(aesKey, 'Server AES message');
        socket.emit('aes server encrypted message', message);
    });
});
*/

// web socket connection event: Envia Chave Pública do Servidor
/*
io.on('connection', function(socket){
    console.log("Enviando Chave Publica");
    socket.emit('Server public key',serverPub);
});
*/
//console.log(aesWrapper.generateKey());
// Server setup
http.listen(3000, function () {
  console.log('listening on *:3000');
});
/*
app.listen(process.env.HTTP_PORT || 3000, '0.0.0.0', () => {
    console.log(`Servidor: http://localhost:${process.env.HTTP_PORT}`);
  });
*/
//Debug das Sessions
/*
app.use((req, res, next) => {
  console.log(store.sessions);
  //console.log(req.session.user.usuarioId);
  next();
})
*/

app.get('/debug', function (req, res) {
  console.log(store);
  //console.log(clientsPublicKeys);
  //console.log(clientsSymmetricKeys);
})

//Verifica sessões encerradas a cada 30s
setInterval(sessionCleanup, 30000);