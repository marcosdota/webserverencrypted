//const Banco = require('../models/banco');
//const Usuario = require('../models/usuario');
const PG = require('../models/pg');
const rsaWrapper = require('../components/rsa-wrapper');
const aesWrapper = require('../components/aes-wrapper');
const sessions_ativa = require('../middlewares/sessions');
const { clientsPublicKeys, clientsSymmetricKeys, downloads } = require('../middlewares/sessions');
const crypto = require('crypto');
const deleteAttach = require('../middlewares/deleteAttach');
const path = require('path');
const bcrypt = require('bcrypt');

module.exports = {

  async cadastrar(req, res) {
    //console.log("Cadastrando");
    if (req.session.authenticated == 1)
      return res.status(400).json({ message: 'Para se cadastrar é necessário estar desconectado' });

    let { usuario, password, confirmapassaword } = req.body;

    if (!(usuario && password && confirmapassaword))
      return res.status(400).json({ message: 'Campos inválidos, verifique as entradas!' });
    if (usuario > 100)
      return res.status(400).json({ message: 'Login deve ter <= 100 caracteres!' });

    password = rsaWrapper.decrypt(rsaWrapper.serverPrivate, password);
    //console.log("Senha: " + password);
    confirmapassaword = rsaWrapper.decrypt(rsaWrapper.serverPrivate, confirmapassaword);
    //console.log("Senha Confirma: " + confirmapassaword);

    if (password != confirmapassaword)
      return res.status(400).json({ message: 'Senhas diferentes, verifique as entradas!' });

    try {
      const saltRounds = 10
      hash = await bcrypt.hash(password, saltRounds);
      let client = await PG.connect();
      const sql = 'INSERT INTO usuarios(login,password) VALUES ($1,$2)';
      const values = [usuario, hash];
      let result = await client.query(sql, values);
      client.release();
      if (result.rowCount > 0)
        return res.status(200).json({ message: 'Cadastrado' });
    }
    catch (err) {
      if (err.code == '23505')
        return res.status(400).json({ message: 'Já existe usuario com esse login' });
      return res.status(400).json({ message: 'Erro!' });
    }
  },

  async login(req, res) {

    if (req.session.authenticated == 1)
      return res.status(400).json({ message: 'Usuario ja logado!' });

    let { usuario, password } = req.body;

    if (!(usuario && password))
      return res.status(400).json({ message: 'Campos inválidos, verifique as entradas!' });
    if (usuario > 100)
      return res.status(400).json({ message: 'Usuario deve ter <= 100 caracteres!' });

    password = rsaWrapper.decrypt(rsaWrapper.serverPrivate, password);
    //console.log("Senha: " + password);

    try {
      let client = await PG.connect();
      const sql = 'SELECT id_usuario,password FROM usuarios WHERE login=$1';
      const values = [usuario];
      let result = await client.query(sql, values);
      client.release();
      if (result.rowCount > 0) {
        hash = result.rows[0]['password'];
        matches = await bcrypt.compare(password, hash);
        if (matches) {
          req.session.authenticated = 1;
          req.session.idUsuario = result.rows[0]['id_usuario'];
          return res.status(200).json({ message: 'Logado com sucesso!' });
        }
        else {
          return res.status(400).json({ message: 'Usuario ou Senha inválidos!' });
        }
      }
      else {
        return res.status(400).json({ message: 'Usuario ou Senha inválidos!' });
      }
    }
    catch (err) {
      return res.status(400).json({ message: 'Erro!' });
    }
    /*
    PG.connect().then((client) => {
      const sql = 'SELECT id_usuario,password FROM usuarios WHERE login=$1';
      const values = [usuario];
      client.query(sql, values).then(function (result) {
        //console.log(result);
        //await client.end();
        client.release();
        if (result.rowCount > 0) {
          hash = result.rows[0]['password'];
          bcrypt.compare(password, hash).then(function (matches) {
            if (matches) {
              req.session.authenticated = 1;
              req.session.idUsuario = result.rows[0]['id_usuario'];
              return res.status(200).json({ message: 'Logado com sucesso!' });
            }
          });
        }
        else {
          return res.status(400).json({ message: 'Usuario ou Senha inválidos!' });
        }
      }).catch(erro => {
        //console.log(erro);
        return res.status(400).json({ message: 'Erro no BD 1' });
      });
    }).catch(function (e) {
      //console.log(e);
      return res.status(400).json({ message: 'Erro no BD 2' });
    });
    */
  },

  getServerPublickKey(req, res) {
    if (req.session.authenticated)
      res.status(200).json({
        publicKey: rsaWrapper.serverPub,
        idUsuario: req.session.idUsuario
      });
    else
      res.status(200).json({ publicKey: rsaWrapper.serverPub });
  },

  setClientePublickKey(req, res) {
    //console.log('Session: ' + req.sessionID);
    //console.log('Chave Pública Cliente: ' + req.body.clientPublicKey);
    clientsPublicKeys.set(req.sessionID, req.body.clientPublicKey);
    return res.status(200).json({ message: 'OK' });
    //console.log(clientsPublicKeys);
  },

  setClientSymmetricKey(req, res) {
    clientSymmetricKey = rsaWrapper.decrypt(rsaWrapper.serverPrivate, req.body.clientSymmetricKey);
    clientsSymmetricKeys.set(req.sessionID, clientSymmetricKey);
    return res.status(200).json({ message: 'OK' });
    //console.log(clientsSymmetricKeys);
  },

  //Verifica o Hash da Chave Simétrica do Cliente (autenticidade)
  //Autoriza o envio de arquivos
  setAuthorization(req, res) {
    clientHashSymmetricKey = req.body.clientHashSymmetricKey;
    clientSymmetricKey = clientsSymmetricKeys.get(req.sessionID);
    hash = (crypto.createHash('sha256').update(new TextEncoder().encode(clientSymmetricKey)).digest('hex'));
    signature = Buffer.from(clientHashSymmetricKey, 'base64');
    authorized = rsaWrapper.verify(
      clientsPublicKeys.get(req.sessionID),
      hash,
      signature
    );

    if (authorized) {
      //console.log("Autorizou");
      req.session.authorized = 1;
      req.session.save();
      return res.status(200).json({ message: 'OK' });
    }
    else
      return res.status(400).json({ message: 'Falhou' });
  },

  async getClientFiles(req, res) {
    try {
      let client = await PG.connect();
      const sql = 'SELECT id_arquivo, arquivo FROM arquivos WHERE id_usuario = $1 AND apagado=FALSE;';
      const values = [req.session.idUsuario];
      let result = await client.query(sql, values);
      //await client.end();
      client.release();
      return res.status(200).json({ files: result.rows });
    }
    catch (err) {
      return res.status(400).json({ message: 'Erro BD!' });
    }
  },

  async getClientSharedFiles(req, res) {
    //Salva no BD a relação do arquivo
    try {
      let client = await PG.connect();
      const sql = 'SELECT compartilhados.id_arquivo, arquivos.arquivo FROM compartilhados, arquivos WHERE compartilhados.id_arquivo = arquivos.id_arquivo AND compartilhados.id_usuario=$1 AND compartilhados.apagado = FALSE';
      const values = [req.session.idUsuario];
      let result = await client.query(sql, values);
      //await client.end();
      client.release();
      return res.status(200).json({ files: result.rows });
    }
    catch (err) {
      return res.status(400).json({ message: 'Erro BD!' });
    }
  },

  async uploadFile(req, res) {
    //console.log("Anexando Arquivo");
    if (req.session.authorized != 1) {
      deleteAttach(req.file?.path);
      return res.status(401).json({ message: 'Este usuário não está autorizado!' });
    }

    //Descriptografa 1 Camada e Verifica Hash do Arquivo
    hash = aesWrapper.decrypt1camada(req.file?.path, clientsSymmetricKeys.get(req.sessionID));
    signature = Buffer.from(req.body.hash, 'base64');
    authorized = rsaWrapper.verify(
      clientsPublicKeys.get(req.sessionID),
      hash,
      signature
    );
    if (!authorized) {
      deleteAttach(req.file?.path);
      return res.status(400).json({ message: "Erro ao salvar arquivo!" });
    }

    try {
      const client = await PG.connect();
      const sql = 'INSERT INTO arquivos(id_usuario,arquivo,local) VALUES ($1,$2,$3);';
      const values = [req.session.idUsuario, req.body.arquivo, req.file?.path];
      let result = await client.query(sql, values);
      await client.end();
      if (result.rowCount > 0)
        return res.status(200).json({ message: 'Arquivo salvo com sucesso!' });
    }
    catch (err) {
      deleteAttach(req.file?.path);
      return res.status(400).json({ message: 'Erro ao salvar arquivo!' });
    }

  },

  async downloadFile(req, res) {
    //console.log("Download Arquivo");
    if (!req.query.idArquivo)
      return res.status(400).json({ message: 'Parametros faltando' });
    try {
      //Verifica se o arquivo é realmente do cliente
      //console.log("Iniciando conexão...");
      const client = await PG.connect();
      //console.log("Conexão OK");
      const sql = 'SELECT compartilhados.id_arquivo, arquivos.arquivo, arquivos.local FROM compartilhados, arquivos WHERE compartilhados.id_arquivo = arquivos.id_arquivo AND compartilhados.id_arquivo=$1 AND compartilhados.id_usuario=$2 AND compartilhados.apagado = FALSE UNION SELECT arquivos.id_arquivo, arquivos.arquivo, arquivos.local FROM arquivos WHERE arquivos.id_arquivo=$1 AND arquivos.id_usuario=$2 AND arquivos.apagado = FALSE;';
      const values = [req.query.idArquivo, req.session.idUsuario];

      let result = await client.query(sql, values);
      //await client.end();
      client.release();
      if (result.rowCount > 0) {
        //console.log(result.rows[0]['local']);
        file = result.rows[0]['local'];

        hash = aesWrapper.encrypt1camada(file, clientsSymmetricKeys.get(req.sessionID));
        file = file.slice(8);
        link = '/encrypt/' + file;

        //Cria lista de arquivos criptografados para download
        let download = [];
        //console.log(download);
        if (downloads.has(req.sessionID))
          download = downloads.get(req.sessionID);
        download.indexOf(link) === -1 ? download.push(link) : console.log("Link ja inserido");
        downloads.set(req.sessionID, download);

        hashE = rsaWrapper.sign(hash);
        return res.status(200).json({
          link: link,
          hash: hashE
        });
      }
    }
    catch (err) {
      return res.status(400).json({ message: err.message });
    }
  },

  async shareFile(req, res) {

    const { usuario, id_arquivo } = req.body;
    //console.log(usuario);
    //console.log(id_arquivo);
    erro = false;

    if (!(usuario) || req.session.idUsuario == usuario || !(id_arquivo))
      return res.status(400).json({ message: 'Campo inválido, verifique as entradas!' });

    try {
      const client = await PG.connect();

      let sql = 'SELECT id_usuario FROM usuarios WHERE id_usuario=$1';
      let values = [usuario];

      let result = await client.query(sql, values);
      if (result.rowCount == 0) {
        //await client.end();
        client.release();
        return res.status(400).json({ message: 'Usuário solicitado não existe!' });
      }

      sql = 'SELECT id_arquivo FROM arquivos WHERE id_arquivo=$1 AND id_usuario=$2 AND apagado = FALSE';
      values = [id_arquivo, req.session.idUsuario];
      result = await client.query(sql, values);
      if (result.rowCount == 0) {
        //await client.end();
        client.release();
        return res.status(400).json({ message: 'Arquivo não autorizado!' });
      }

      sql = 'INSERT INTO compartilhados(id_usuario,id_arquivo,apagado) VALUES ($1,$2,FALSE)';
      values = [usuario, id_arquivo];
      result = await client.query(sql, values);
      //await client.end();
      client.release();
      if (result.rowCount > 0)
        return res.status(200).json({ message: 'Arquivo compartilhado!' });

    } catch (err) {
      if (err.code == '23505')
        return res.status(400).json({ message: 'O arquivo já está sendo compartilhado com esse usuário' });
      return res.status(400).json({ message: err.message });
    }
  },

  async deleteFile(req, res) {

    const { id_arquivo } = req.body;

    if (!id_arquivo)
      return res.status(400).json({ message: 'Campo inválido, verifique as entradas!' });

    try {
      const client = await PG.connect();

      let sql = 'SELECT id_arquivo FROM arquivos WHERE id_usuario=$1 AND id_arquivo=$2 AND apagado = FALSE';
      let values = [req.session.idUsuario, id_arquivo];

      let result = await client.query(sql, values);
      if (result.rowCount > 0) {
        //Tabela Arquivos
        sql = 'UPDATE arquivos SET apagado = TRUE WHERE id_usuario=$1 AND id_arquivo=$2';
        values = [req.session.idUsuario, id_arquivo];
        result = await client.query(sql, values);
        //await client.end();
        client.release();
        if (result.rowCount > 0)
          return res.status(200).json({ message: 'Arquivo apagado!' });
      }
      else {
        //Tabela Compartilhados
        sql = 'SELECT id_arquivo FROM compartilhados WHERE id_usuario=$1 AND id_arquivo=$2 AND apagado = FALSE';
        values = [req.session.idUsuario, id_arquivo];
        result = await client.query(sql, values);
        if (result.rowCount > 0) {
          sql = 'UPDATE compartilhados SET apagado = TRUE WHERE id_usuario=$1 AND id_arquivo=$2';
          values = [req.session.idUsuario, id_arquivo];
          result = await client.query(sql, values);
          //await client.end();
          client.release();
          if (result.rowCount > 0)
            return res.status(200).json({ message: 'Arquivo apagado!' });
          else
            return res.status(400).json({ message: 'Arquivo não encontrado!' });
        }
      }
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }
}