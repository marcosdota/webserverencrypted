const session = require('express-session');
const deleteAttach = require('./deleteAttach');
const path = require('path');

const store = new session.MemoryStore({
    //checkPeriod: 600 // Verifica session a cada 10 minutos (10*60) - Depecreciado
});
let clientsPublicKeys = new Map();
let clientsSymmetricKeys = new Map();
let downloads = new Map();

//Verifica Session ativas e remove chaves públicas e simétricas dos clientes com sessão encerrada
function sessionCleanup() {

    store.all(function (err, sessions) {
        console.log('Encerrando Sessions Inativas');
        const session_ativas = new Map(Object.entries(sessions));
        console.log(session_ativas);
        console.log(clientsPublicKeys);
        console.log(clientsSymmetricKeys);
        console.log(downloads);


        for (const [key, value] of clientsPublicKeys) {
            if (!session_ativas.has(key)) {
                clientsPublicKeys.delete(key);
                clientsSymmetricKeys.delete(key);
                if (downloads.has(key)) {
                    for (const file of downloads.get(key)) {
                        deleteAttach(path.resolve(__dirname, '../', 'uploads/' + file));
                    }
                    downloads.delete(key);
                }
            }
        }
    });
}

module.exports = { store, clientsPublicKeys, clientsSymmetricKeys, downloads, sessionCleanup };