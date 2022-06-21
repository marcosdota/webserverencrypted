let aesKey;
let keys; // Chave Pública e Privada do Servidor [Não exportada]
let serverPublicKey;
let clientPublicKeyPEM; //Apenas para apresentação
let clientPrivateKeyPEM; //Apenas para apresentação

//Gera Senha Simétrica do Cliente para cada Sessão
const generatePassword = (length = 32, wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
) => Array.from(window.crypto.getRandomValues(new Uint8Array(length))).map((x) => wishlist[x % wishlist.length]).join('')

//Gerando Hash SHA-256
async function digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
}

// Logger Fim da Página
function addLog(title, content) {
    var iDiv = document.createElement('div');
    var h = document.createElement('h2');
    h.append(title);
    iDiv.appendChild(h);
    var p = document.createElement('p');
    p.append(content);
    iDiv.appendChild(p);
    document.getElementById('log').appendChild(iDiv);
    document.getElementById('log').appendChild(document.createElement('hr'));
}

//Handshake
(async () => {
    console.log('Iniciou Handshake!');
    try {
        //Chave Pública do Servidor
        let response = await axios.get('/getServerPublicKey');
        serverPublicKey = response.data.publicKey;
        document.getElementById('server_public').value = response.data.publicKey;
        document.getElementById('idUsuario').innerHTML = "Identificação Usuário: " + response.data.idUsuario;
        addLog('Chave Pública do Servidor:', response.data.publicKey);

        //Gera Chave Pública e Privada para o Cliente [Toda vez ao entrar ou recarregar página]
        keys = await window.crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048, //Pode ser 1024, 2048, or 4096
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: {name: "SHA-256"}, //Pode ser "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
            },
            true, // Se a chave é extraível (ou seja, pode ser usada em exportKey)
            ["sign", "verify"] // Pode ser qualquer combinação de "assinar" e "verificar"
        )
        //console.log(keys);

        //Processo para extrair chave e apresentar na tela [Pode ser removida essa parte para chave Privada]
        let clientPublicKey = keys.publicKey;
        let clientPrivateKey = keys.privateKey;

        //Exportando a chave pública do cliente para enviar ao servidor e mostrar no textarea
        clientPublicKey = await window.crypto.subtle.exportKey(
            "spki", //Pode ser "jwk" (publica ou privada), "spki" (apenas publica) ou "pkcs8" (apenas privada)
            clientPublicKey //Pode ser publicKey ou privateKey, desde que esteja extraível (true)
        );
        clientPublicKey = spkiToPEM(clientPublicKey);
        clientPublicKeyPEM = clientPublicKey;
        document.getElementById('client_public').value = clientPublicKey;
        addLog('Chave Pública do Cliente:', clientPublicKey);
        //Enviando Chave Pública do Cliente no formato PEM
        await axios.post('/sendClientPublicKey', {
            clientPublicKey: clientPublicKey
        });

        //Exportando a chave privada do cliente para mostrar no textarea (EXTREMAMENTE RECOMENDÁVEL NÃO FAZER ISSO - APENAS DIDÁTICO)
        clientPrivateKey = await window.crypto.subtle.exportKey(
            "pkcs8",
            clientPrivateKey
        );
        // spki e pkcs8 -> para PEM (mesmo processo)
        clientPrivateKey = spkiToPEM(clientPrivateKey);
        clientPrivateKeyPEM = clientPrivateKey;
        document.getElementById('client_private').value = clientPrivateKey;
        addLog('Chave Privada do Cliente:', clientPrivateKey);

        //Gerando chave simétrica
        let symmetricKey = generatePassword();
        aesKey = symmetricKey;
        //(EXTREMAMENTE RECOMENDÁVEL NÃO APRESENTAR - APENAS DIDÁTICO)
        document.getElementById('client_symmetric').value = symmetricKey;
        addLog('Chave Simétrica:', symmetricKey);
        //Criptografar chave simétrica com a chave pública do servidor
        publicKey = converterWrapper.convertPemToBinary2(serverPublicKey);
        publicKey = converterWrapper.base64StringToArrayBuffer(publicKey);
        publicKey = await window.crypto.subtle.importKey(
            "spki", publicKey,
            { 
                name: "RSA-OAEP",
                hash: { name: "SHA-256" }, 
            },
            false,
            ["encrypt"]
        );
    
        encrypted = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
                hash: { name: "SHA-256" }
    
            },
            publicKey,
            new TextEncoder("utf-8").encode(symmetricKey)
        )
        encrypted = converterWrapper.arrayBufferToBase64String(encrypted);
        addLog('Chave Simétrica (Criptografada pela Chave Pública do Servidor (RSA) codificada em base64):', encrypted);
        //Enviando Chave Simétrica Criptografada RSA
        await axios.post('/sendClientSymmetricKey', {
            clientSymmetricKey: encrypted,
        });

        //Gerando Hash SHA-256 da Chave Simétrica
        let hashClienteSymmetricKey = await digestMessage(symmetricKey);
        addLog('Hash (SHA256) Chave Simétrica:', hashClienteSymmetricKey);
        document.getElementById('hashClienteSymmetricKey').value = hashClienteSymmetricKey;

        //Criptografando (Assinando RSA com a chave privada do cliente) o Hash da Chave Simétrica
        hashClienteSymmetricKey = new TextEncoder("utf-8").encode(hashClienteSymmetricKey);
        encrypted = await window.crypto.subtle.sign(
            {
                name: "RSASSA-PKCS1-v1_5",
            },
            keys.privateKey,
            hashClienteSymmetricKey
        )
        encrypted = converterWrapper.arrayBufferToBase64String(encrypted);
        addLog('Hash Chave Simétrica (Assinada pela Chave Privada do Cliente (RSA) codificada em base64):', encrypted);
        //Enviar HASH para autorizar envio de arquivos
        await axios.post('/sendHashSymmetricKey', {
            clientHashSymmetricKey: encrypted
        });
    } catch (e) {
        console.error(e);
    }
    console.log('Finalizou Handshake!');
})()