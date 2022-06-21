/*
    Login na Aplicação
    Criptografa senha RSA-OAEP com Chave Pública do Servidor
*/
var btnLogin = document.querySelector('input#login');

var btnCadastro = document.querySelector('input#cadastro');

async function getPublickKeyServer() {
    try {
        const response = await axios.get('/getServerPublicKey');
        if (response.status == 200) {
            return response;
        }
    } catch (e) {
        console.log(e);
        alert("Erro no servidor, tente mais tarde!");
    }
}

btnLogin.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    var login = document.querySelector('input#userlogin').value;
    var password = document.querySelector('input#loginpassword').value;
    if (login == "" || password == "") {
        alert("Preencha os campos corretamente (Usuário ou Senha)");
        return;
    }
    if (login.length > 100) {
        alert("Login deve ter <= 100 caracteres");
        return;
    }

    publicKey = await getPublickKeyServer(); //Formato PEM 
    publicKey = converterWrapper.convertPemToBinary2(publicKey.data.publicKey);
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

    password = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
            hash: { name: "SHA-256" }

        },
        publicKey,
        new TextEncoder("utf-8").encode(password)
    )
    password = converterWrapper.arrayBufferToBase64String(password);

    try {
        const response = await axios.post('/login', {
            usuario: login,
            password: password,
        });

        if (response.status == 200) {
            window.location.href = "/app.html";
        }
    } catch (e) {
        alert(e.response.data.message);
    }
    return false;
});

btnCadastro.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    var login = document.querySelector('input#cadlogin').value;
    var password = document.querySelector('input#cadpassword').value;
    var passwordconfirm = document.querySelector('input#cadpasswordconfirm').value;
    if (login == "" || password == "" || passwordconfirm == "") {
        alert("Preencha os campos corretamente (Usuário ou Senha ou Repita a senha)");
        return;
    }
    if (login.length > 100) {
        alert("Login deve ter <= 100 caracteres");
        return;
    }
    if (password != passwordconfirm) {
        alert("Senhas diferentes");
        return;
    }

    publicKey = await getPublickKeyServer(); //Formato PEM 
    publicKey = converterWrapper.convertPemToBinary2(publicKey.data.publicKey);
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

    password = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
            hash: { name: "SHA-256" }

        },
        publicKey,
        new TextEncoder("utf-8").encode(password)
    )
    password = converterWrapper.arrayBufferToBase64String(password);

    passwordconfirm = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
            hash: { name: "SHA-256" }
        },
        publicKey,
        new TextEncoder("utf-8").encode(passwordconfirm)
    )
    passwordconfirm = converterWrapper.arrayBufferToBase64String(passwordconfirm);

    try {
        const response = await axios.post('/cadastrar', {
            usuario: login,
            password: password,
            confirmapassaword: passwordconfirm
        });
        //console.log(response);
        if (response.status == 200) {
            alert(response.data.message);
            document.querySelector('input#cadlogin').value = "";
            document.querySelector('input#cadpassword').value = "";
            document.querySelector('input#cadpasswordconfirm').value = "";
        }
    } catch (e) {
        //https://codepen.io/pivkhan/pen/aOBZxg
        alert(e.response.data.message);
    }
    return false;
});