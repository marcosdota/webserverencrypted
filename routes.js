const express = require('express');
const multer = require('multer');

const verificaSession = require('./middlewares/verificaSession');
//const Usuario = require('./controllers/usuario');
//const Post = require('./controllers/post');
const Cliente = require('./controllers/cliente');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    //console.log(file);
    //cb(null, `${Date.now()}_${file.originalname}.enc`)
    cb(null, `${Date.now()}_${Math.random()}.enc`)
  }
});

const app = express();
const upload = multer({ storage: storage });

//################# SERVER PUBLIC KEY ###################
app.get('/getServerPublicKey', Cliente.getServerPublickKey)

//################# CLIENT PUBLIC KEY ###################
app.post('/sendClientPublicKey', verificaSession, Cliente.setClientePublickKey);

//################# CLIENT SYMMETRIC KEY ###################
app.post('/sendClientSymmetricKey', verificaSession, Cliente.setClientSymmetricKey);
app.post('/sendHashSymmetricKey', verificaSession, Cliente.setAuthorization);

//################# UPLOAD ###################
app.post('/upload', verificaSession, upload.single('attach'), Cliente.uploadFile);

//################# FILES ###################
app.get('/files', verificaSession, Cliente.getClientFiles);
app.get('/filesShared', verificaSession, Cliente.getClientSharedFiles);

//################# DOWNLOAD ###################
app.get('/download', verificaSession, Cliente.downloadFile);

//################# CONSISTÊNCIAS DE LOGIN ###################
//Rota -> Vai para o index.html -> Página principal do projeto
app.get('/', function (req, res) {
  if (req.session.authenticated == 1)
    res.redirect('/app.html');
  else
    res.redirect('/login.html');
})

app.get('/app.html', function (req, res, next) {
  if (req.session.authenticated != 1)
    res.redirect('/login.html');
  else
    next();
})

app.get('/login.html', function (req, res, next) {
  if (req.session.authenticated == 1)
    res.redirect('/app.html');
  else
    next();
})

//################# CADASTRO E LOGIN ###################
app.post('/cadastrar', Cliente.cadastrar);
app.post('/login', Cliente.login);

//################# COMPARTILHAR ARQUIVO ###################
app.post('/share', verificaSession, Cliente.shareFile);

//################# APAGAR ARQUIVO ###################
app.post('/delete', verificaSession, Cliente.deleteFile);

//################# LOGOUT ###################
app.get('/logout', verificaSession, function (req, res) {
  req.session.destroy();
})

/**
 * Salvar dados com Multer e AXIOS
 * @see https://pt.stackoverflow.com/questions/420362/upload-de-imagem-com-axios-para-um-servidor-node-js
 */

module.exports = app;