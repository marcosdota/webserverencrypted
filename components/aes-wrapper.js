const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
var pkcs7 = require('pkcs7');

const aesWrapper = {};

// get list of supportable encryption algorithms
aesWrapper.getAlgorithmList = () => {
    console.log(crypto.getCiphers());
};

aesWrapper.generateKey = () => {
    return crypto.randomBytes(32);
};

aesWrapper.generateIv = () => {
    return crypto.randomBytes(16);
};

// separate initialization vector from message
aesWrapper.separateVectorFromData = (data) => {
    console.log(data);
    console.log('data');
    var iv = data.slice(-24);
    var message = data.substring(0, data.length - 24)

    return {
        iv: iv,
        message: message
    };
}

aesWrapper.encrypt = (key, iv, text) => {
    let encrypted = '';
    let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    encrypted += cipher.update(Buffer.from(text), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
};

aesWrapper.decrypt = (key, text) => {
    let dec = '';
    let data = aesWrapper.separateVectorFromData(text);
    let cipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(data.iv, 'base64'));
    dec += cipher.update(Buffer.from(data.message, 'base64'), 'base64', 'utf8');
    dec += cipher.final('utf8');

    return dec;
};

// add initialization vector to message
aesWrapper.addIvToBody = (iv, encryptedBase64) => {
    encryptedBase64 += iv.toString('base64');
    console.log(iv.toString('base64'));

    return encryptedBase64;
};

aesWrapper.createAesMessage = (aesKey, message) => {
    let aesIv = aesWrapper.generateIv();
    let encryptedMessage = aesWrapper.encrypt(aesKey, aesIv, message);
    encryptedMessage = aesWrapper.addIvToBody(aesIv, encryptedMessage);

    return encryptedMessage;
};

aesWrapper.decrypt1camada = (file, aesKey) => {
    //console.log(file);
    try {
        let fileC = fs.readFileSync(path.resolve(__dirname, '../', file));
        //console.log(fileC);
        //console.log("\n\n" + aesKey)
        ivbytes = Buffer.from(aesKey.slice(0, 16));
        aesKey = Buffer.from(aesKey);
        let decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, ivbytes);
        dec = decipher.update(fileC, 'utf8');
        //dec += decipher.final('utf8');
        hash = (crypto.createHash('sha256').update(dec).digest('hex'));
        fs.writeFileSync(path.resolve(__dirname, '../', file), dec);
        console.log(hash);
        return hash;
    }
    catch {
        return '';
    }
};

aesWrapper.hash = (file) => {
    try {
        let fileC = fs.readFileSync(path.resolve(__dirname, '../', file));
        hash = (crypto.createHash('sha256').update(fileC).digest('hex'));
        return hash;
    }
    catch {
        return '';
    }
}

aesWrapper.encrypt1camada = (file, aesKey) => {
    console.log("CRIPTOGRAFANDO TRANSPORTE");
    let fileC = fs.readFileSync(path.resolve(__dirname, '../', file));
    console.log(fileC);
    ivbytes = Buffer.from(aesKey.slice(0, 16));
    aesKey = Buffer.from(aesKey);
    let encrypted;
    let cipher = crypto.createCipheriv('aes-256-cbc', aesKey, ivbytes);
    encrypted = cipher.update(fileC, 'utf8');
    console.log("TESTE: " + typeof (encrypted));
    //encrypted = cipher.update(fileC,'utf8');
    //encrypted += pkcs7.pad(fileC);
    final = cipher.final('binary');
    console.log(typeof (final));
    //encrypted = cipher.setAutoPadding()
    /*encrypted = Buffer.concat([
        cipher.update(fileC, 'utf8'),
        cipher.final('binary')
      ]);
      */
    final = Buffer.from(final, 'binary')
    encrypted = Buffer.concat([encrypted, final]);
    hash = (crypto.createHash('sha256').update(fileC).digest('hex'));
    file = file.slice(8);
    //console.log(file);
    fs.writeFileSync(path.resolve(__dirname, '../', 'uploads', 'encrypt', file), encrypted);
    return hash;
};

module.exports = aesWrapper;