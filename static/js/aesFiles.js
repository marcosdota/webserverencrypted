var mode = null;
var objFile = null;
switchdiv('encrypt');

function switchdiv(t) {
    if (t == 'encrypt') {
        divEncryptfile.style.display = 'block';
        divDecryptfile.style.display = 'none';
        btnDivEncrypt.disabled = true;
        btnDivDecrypt.disabled = false;
        mode = 'encrypt';
    } else if (t == 'decrypt') {
        getFiles();
        getFilesShared();
        divEncryptfile.style.display = 'none';
        divDecryptfile.style.display = 'block';
        btnDivEncrypt.disabled = false;
        btnDivDecrypt.disabled = true;
        mode = 'decrypt';
    }
}

function encvalidate() {
    if (txtEncpassphrase.value.length >= 8 && txtEncpassphrase.value == txtEncpassphraseretype.value) {
        spnCheckretype.classList.add("greenspan");
        spnCheckretype.classList.remove("redspan");
        spnCheckretype.innerHTML = '&#10004;';
    } else {
        spnCheckretype.classList.remove("greenspan");
        spnCheckretype.classList.add("redspan");
        spnCheckretype.innerHTML = '&#10006;';
        spnEncstatus.classList.remove("greenspan");
        spnEncstatus.innerHTML = '';
    }

    if (txtEncpassphrase.value.length >= 8 && txtEncpassphrase.value == txtEncpassphraseretype.value && objFile) { btnEncrypt.disabled = false; } else { btnEncrypt.disabled = true; }
}

function decvalidate() {
    //if (txtDecpassphrase.value.length > 0 && objFile) { btnDecrypt.disabled = false; } else { btnDecrypt.disabled = true; }
}

//drag and drop functions:
//https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
function drop_handler(ev) {
    //console.log("Drop");
    ev.preventDefault();
    // If dropped items aren't files, reject them
    var dt = ev.dataTransfer;
    if (dt.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (var i = 0; i < dt.items.length; i++) {
            if (dt.items[i].kind == "file") {
                var f = dt.items[i].getAsFile();
                //console.log("... file[" + i + "].name = " + f.name);
                objFile = f;
            }
        }
    } else {
        // Use DataTransfer interface to access the file(s)
        /*for (var i = 0; i < dt.files.length; i++) {
            console.log("... file[" + i + "].name = " + dt.files[i].name);
        }*/
        objFile = file[0];
    }
    displayfile()
    if (mode == 'encrypt') { encvalidate(); } //else if (mode == 'decrypt') { decvalidate(); }
}

function dragover_handler(ev) {
    //console.log("dragOver");
    // Prevent default select and drag behavior
    ev.preventDefault();
}

function dragend_handler(ev) {
    //console.log("dragEnd");
    // Remove all of the drag data
    var dt = ev.dataTransfer;
    if (dt.items) {
        // Use DataTransferItemList interface to remove the drag data
        for (var i = 0; i < dt.items.length; i++) {
            dt.items.remove(i);
        }
    } else {
        // Use DataTransfer interface to remove the drag data
        ev.dataTransfer.clearData();
    }
}

function selectfile(Files) {
    objFile = Files[0];
    displayfile()
    if (mode == 'encrypt') { encvalidate(); } //else if (mode == 'decrypt') { decvalidate(); }
}

function displayfile() {
    var s;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (!objFile)
        return;
    var bytes = objFile.size;
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) { s = bytes + ' ' + sizes[i]; } else { s = (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]; }

    if (mode == 'encrypt') {
        spnencfilename.textContent = objFile.name + ' (' + s + ')';
    } else if (mode == 'decrypt') {
        spndecfilename.textContent = objFile.name + ' (' + s + ')';
    }
}

function readfile(file) {
    return new Promise((resolve, reject) => {
        var fr = new FileReader();
        fr.onload = () => {
            resolve(fr.result)
        };
        fr.readAsArrayBuffer(file);
    });
}

//####################### Implementação do Grupo #######################
async function encryptfile() {
    //console.log("Criptografando....");
    btnEncrypt.disabled = true;
    var plaintextbytes = await readfile(objFile)
        .catch(function (err) {
            console.error(err);
        });
    var plaintextbytes = new Uint8Array(plaintextbytes);

    //Criptografia com Senha do Cliente (Digitada) 1º Camada
    if (txtEncpassphrase.value.length > 32 || txtEncpassphrase.value.length < 8 || txtEncpassphrase.value.length == 0) {
        alert("Senha inválida, verifique!");
        return;
    }
    var encoder = new TextEncoder("utf-8");
    var passphrasebytes = new Uint8Array(32);
    passphrasebytes.set(encoder.encode(txtEncpassphrase.value));
    ivbytes = passphrasebytes.slice(0, 16);
    var key = await window.crypto.subtle.importKey('raw', passphrasebytes, { name: 'AES-CBC', length: 256 }, false, ['encrypt'])
        .catch(function (err) {
            console.error(err);
        });

    var cipherbytes = await window.crypto.subtle.encrypt({ name: "AES-CBC", iv: ivbytes }, key, plaintextbytes)
        .catch(function (err) {
            console.error(err);
        });

    if (!cipherbytes) {
        spnEncstatus.classList.add("redspan");
        spnEncstatus.innerHTML = '<p>Erro ao criptografar arquivo.</p>';
        return;
    }
    //Finalizou 1º Camada

    //Hash do arquivo
    const hashBuffer = await crypto.subtle.digest('SHA-256', cipherbytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    let hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    addLog('Hash (SHA256) do arquivo criptografado em AES-CBC com senha inserida (1º camada):', hashHex);
    hashHex = new TextEncoder("utf-8").encode(hashHex);
    //Assinar HASH com chave privada do Cliente
    let hashEncrypted = await window.crypto.subtle.sign(
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: { name: "SHA-256" }
        },
        keys.privateKey, //De generateKey do arquivo: app.js
        hashHex
    );
    hashEncrypted = converterWrapper.arrayBufferToBase64String(hashEncrypted); //Codificado em Base64
    addLog('Hash do arquivo criptografado (Assinado pela Chave Privada do Cliente (RSA) codificado em base64):', hashEncrypted);

    //Criptografa com Chave Simétrica para Transmitir (2º Camada)
    var encoder = new TextEncoder("utf-8");
    let symetrickey = encoder.encode(aesKey); //Do arquivo: app.js
    ivbytes = symetrickey.slice(0, 16);
    symetrickey = await window.crypto.subtle.importKey("raw", symetrickey, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]).catch(function (err) {
        console.error(err);
    });
    var resultbytes = await window.crypto.subtle.encrypt({ name: "AES-CBC", iv: ivbytes }, symetrickey, cipherbytes).catch(function (err) {
        console.error(err);
    });
    if (!resultbytes) {
        spnEncstatus.classList.add("redspan");
        spnEncstatus.innerHTML = '<p>Erro ao criptografar arquivo.</p>';
        return;
    }
    //Finalizou 2º Camada

    // Arquivo blob para enviar
    var blob = new Blob([resultbytes], { originalname: objFile.name });
    //Enviando Arquivo Duplamente Criptografado e Hash assinado
    const formData = new FormData();
    formData.append("attach", blob);
    formData.append("arquivo", objFile.name);
    formData.append("hash", hashEncrypted)
    axios.post("/upload", formData, {
        headers: {
            "Content-Type": `encrypted; boundary=${formData._boundary}`,
        }
    }).then(function (response) {
        //Atualizando GUI
        spnEncstatus.classList.add("greenspan");
        spnEncstatus.innerHTML = '<p>Arquivo criptografado e enviado!</p>';
        btnEncrypt.disabled = true;
        txtEncpassphrase.value = "";
        txtEncpassphraseretype.value = "";
        spnCheckretype.innerHTML = "";
    }).catch(function (e) {
        //console.log(e);
        spnEncstatus.classList.add("redspan");
        spnEncstatus.innerHTML = '<p>Ocorreu algum erro! Tente mais tarde!</p>';
    });
}

async function decryptfile(id, arquivoNome) {
    //Descriptografando
    var passphrasebytes = new TextEncoder("utf-8").encode(txtDecpassphrase.value);
    if (txtDecpassphrase.value.length > 32 || txtDecpassphrase.value.length < 8 || txtDecpassphrase.value.length == 0) {
        spnDecstatus.classList.add("redspan");
        spnDecstatus.innerHTML = '<p>Senha Inválida (min=8;max=32)</p>';
        return;
    }

    //Envia Id do arquivo solicitado para o servidor
    let response = await axios.get('/download', {
        params: {
            idArquivo: id
        }
    });
    //Recebe o link do arquivo se pertence ao usuário que solicitou
    let file = await axios({
        method: 'get',
        url: window.location.origin + '/uploads' + response.data.link,
        responseType: 'blob'
    });

    //Recebe dados do arquivo solicitado pelo Link
    let blob = await new Blob([file.data]).arrayBuffer();
    blob = new Uint8Array(blob);

    //Primeira Rodada de Descriptografia (Chave Simétrica) (1º Camada)
    var encoder = new TextEncoder("utf-8");
    let symetrickey = encoder.encode(aesKey); //Do arquivo: app.js
    var ivbytes = symetrickey.slice(0, 16);
    symetrickey = await window.crypto.subtle.importKey("raw", symetrickey, { name: "AES-CBC", length: 256 }, false, ["decrypt"]).catch(function (err) {
        console.error(err);
    });
    var cipherbytes = await window.crypto.subtle.decrypt({ name: "AES-CBC", iv: ivbytes }, symetrickey, blob)
        .catch(function (err) {
            console.error(err);
        });
    if (!cipherbytes) {
        spnDecstatus.classList.add("redspan");
        spnDecstatus.innerHTML = '<p>Erro ao descriptografar. Tente mais tarde.</p>';
        return;
    }
    //Finalizou 1º Camada de Descriptografia

    //Hash do arquivo
    const hashBuffer = await crypto.subtle.digest('SHA-256', cipherbytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    let hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    addLog('Hash do arquivo após descriptografia da camada de transporte (Descriptografado AES-CBC pela Chave Simétrica):', hashHex);

    publicKey = converterWrapper.convertPemToBinary2(serverPublicKey);
    publicKey = converterWrapper.base64StringToArrayBuffer(publicKey);
    publicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKey,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: { name: "SHA-256" },
        },
        false,
        ["verify"]
    );

    let signature = response.data.hash;
    signature = converterWrapper.base64StringToArrayBuffer(signature);
    signature = new Uint8Array(signature);
    hashHex = encoder.encode(hashHex);
    let valido = await window.crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5", }, publicKey, signature, hashHex).catch(function (err) {
        console.error(err);
    });
    //Verifica se assinatura é válida
    if (!valido) {
        spnDecstatus.classList.add("redspan");
        spnDecstatus.innerHTML = '<p>Erro ao verificar assinatura.</p>';
        return;
    }

    //Segunda Rodada de Descriptografia (Chave Pessoal) (2º Camada)
    var encoder = new TextEncoder("utf-8");
    var passphrasebytes = new Uint8Array(32);
    passphrasebytes.set(encoder.encode(txtDecpassphrase.value));
    ivbytes = passphrasebytes.slice(0, 16);
    passphrasebytes = await window.crypto.subtle.importKey("raw", passphrasebytes, { name: "AES-CBC", length: 256 }, false, ["decrypt"]).catch(function (err) {
        console.error(err);
    });
    var plaintextbytes = await window.crypto.subtle.decrypt({ name: "AES-CBC", iv: ivbytes }, passphrasebytes, cipherbytes)
        .catch(function (err) {
            console.error(err);
        });
    if (!plaintextbytes) {
        spnDecstatus.classList.add("redspan");
        spnDecstatus.innerHTML = '<p>Erro ao descriptografar. Verifique a senha.</p>';
        return;
    }
    //Finalizou 2º Camada de Descriptografia

    //Criar arquivo blob para usuário salvar
    blob = new Blob([plaintextbytes], { type: 'application/download' });
    var blobUrl = URL.createObjectURL(blob);
    aDecsavefile.href = blobUrl;
    aDecsavefile.download = arquivoNome;

    spnDecstatus.classList.remove("redspan");
    spnDecstatus.classList.remove("greenspan");
    spnDecstatus.classList.add("greenspan");
    spnDecstatus.innerHTML = '<p>Arquivo descriptografado!</p>';
    aDecsavefile.hidden = false;
    txtDecpassphrase.value = "";
}

async function shareFile(id) {
    let usuario = prompt("Digite o id do usuario desejado para compartilhar arquivo: ");
    usuario = parseInt(usuario);
    //console.log(usuario);
    if (usuario == null || usuario == "" || typeof usuario != 'number' || isNaN(usuario)) {
        alert('Valor Inválido');
        return;
    }
    try {
        const response = await axios.post('/share', {
            usuario: usuario,
            id_arquivo: id,
        });
        //console.log(response);
        if (response.status == 200) {
            alert("Compartilhado com sucesso!")
        }
    } catch (e) {
        //console.log(e);
        alert(e.response.data.message);
    }
}

async function deleteFile(id) {

    if (confirm("Deseja apagar o arquivo?") == true) {
        try {
            const response = await axios.post('/delete', {
                id_arquivo: id,
            });
            //console.log(response);
            if (response.status == 200) {
                alert("Arquivo Apagado!");
                getFiles();
                getFilesShared();
            }
        } catch (e) {
            //console.log(e);
            alert(e.response.data.message);
        }
    }
}

function tableCreateFiles(dados) {
    const files = document.querySelector(".files");
    files.innerHTML = '';
    tbl = document.createElement('table');
    tbl.style.width = '100px';
    tbl.style.border = '1px solid black';

    tr = tbl.insertRow();
    //td = tr.insertCell();
    tr.appendChild(document.createTextNode(`Arquivos`));
    tr.style.border = '1px solid black';

    for (let i = 0; i < dados.data.files.length; i++) {
        const tr = tbl.insertRow();
        for (let j = 0; j < 4; j++) {
            const td = tr.insertCell();
            if (j == 0) {
                td.appendChild(document.createTextNode(`${dados.data.files[i]['arquivo']}`));
                //td.style.border = '1px solid black';
            }

            else if (j == 1) {
                btn = document.createElement("button");
                btn.innerHTML = "Descriptografar";
                btn.addEventListener("click", async function () { decryptfile(dados.data.files[i]['id_arquivo'], dados.data.files[i]['arquivo']) }, false);
                document.body.appendChild(btn);
                td.appendChild(btn);
            }
            else if (j == 2) {
                btn = document.createElement("button");
                btn.innerHTML = "Apagar";
                btn.addEventListener("click", async function () { deleteFile(dados.data.files[i]['id_arquivo']) }, false);
                document.body.appendChild(btn);
                td.appendChild(btn);
            }
            else {
                btn = document.createElement("button");
                btn.innerHTML = "Compartilhar";
                btn.addEventListener("click", async function () { shareFile(dados.data.files[i]['id_arquivo']) }, false);
                document.body.appendChild(btn);
                td.appendChild(btn);
            }

        }
    }
    files.appendChild(tbl);
}

function tableCreateFilesShared(dados) {
    const files = document.querySelector(".filesShared");
    files.innerHTML = '';
    tbl = document.createElement('table');
    tbl.style.width = '100px';
    tbl.style.border = '1px solid black';

    tr = tbl.insertRow();
    //td = tr.insertCell();
    tr.appendChild(document.createTextNode(`Compartilhados com você`));
    tr.style.border = '1px solid black';

    for (let i = 0; i < dados.data.files.length; i++) {
        const tr = tbl.insertRow();
        for (let j = 0; j < 4; j++) {
            const td = tr.insertCell();
            if (j == 0) {
                td.appendChild(document.createTextNode(`${dados.data.files[i]['arquivo']}`));
                //td.style.border = '1px solid black';
            }

            else if (j == 1) {
                btn = document.createElement("button");
                btn.innerHTML = "Descriptografar";
                btn.addEventListener("click", function () { decryptfile(dados.data.files[i]['id_arquivo'], dados.data.files[i]['arquivo']) }, false);
                document.body.appendChild(btn);
                td.appendChild(btn);
            }
            else if (j == 2) {
                btn = document.createElement("button");
                btn.innerHTML = "Apagar";
                btn.addEventListener("click", async function () { deleteFile(dados.data.files[i]['id_arquivo']) }, false);
                document.body.appendChild(btn);
                td.appendChild(btn);
            }
        }
    }
    files.appendChild(tbl);
}

function getFiles() {
    axios.get('/files').then(function (response) {
        //console.log(response.data.files);
        tableCreateFiles(response);
    }).catch(function (error) {
        console.log(error);
    })
}

function getFilesShared() {
    //console.log("Passou AQUI");
    axios.get('/filesShared').then(function (response) {
        //console.log("2" + response.data.files);
        tableCreateFilesShared(response);
    }).catch(function (error) {
        console.log(error);
    })
}

function logout() {
    axios.get('/logout');
    window.location.href = "/";
}