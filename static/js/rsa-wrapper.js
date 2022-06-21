/*
    Não utilizada na implementação
*/
(function () {

    'use strict';

    var crypto = window.crypto.subtle;
    var rsaParams = { name: "RSA-OAEP", hash: { name: "SHA-256" } };
    var rsaParams2 = { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } };

    function importPublicKey(keyInPemFormat) {
        return new Promise(function (resolve, reject) {
            var key = converterWrapper.convertPemToBinary2(keyInPemFormat);
            key = converterWrapper.base64StringToArrayBuffer(key);

            crypto.importKey('spki', key, rsaParams, false, ["encrypt"])
                .then(function (cryptokey) {
                    resolve(cryptokey);
                });
        });
    }

    function importPublicKey2(keyInPemFormat) {
        var key = converterWrapper.convertPemToBinary2(keyInPemFormat);
        key = converterWrapper.base64StringToArrayBuffer(key);
        return new Promise(function (resolve, reject) {
            crypto.importKey('spki', key, rsaParams2, false, ["verify"])
                .then(function (cryptokey) {
                    resolve(cryptokey);
                });
        });
    }

    function importPrivateKey(keyInPemFormat) {

        var key = converterWrapper.convertPemToBinary2(keyInPemFormat);
        key = converterWrapper.base64StringToArrayBuffer(key);

        return new Promise(function (resolve, reject) {
            crypto.importKey('pkcs8', key, rsaParams, false, ["decrypt"])
                .then(function (cryptokey) {
                    resolve(cryptokey);
                });
        });
    }

    function importPrivateKey2(keyInPemFormat) {

        var key = converterWrapper.convertPemToBinary2(keyInPemFormat);
        key = converterWrapper.base64StringToArrayBuffer(key);

        return new Promise(function (resolve, reject) {
            crypto.importKey('pkcs8', key, rsaParams2, false, ["sign"])
                .then(function (cryptokey) {
                    resolve(cryptokey);
                });
        });
    }

    function publicEncrypt(keyInPemFormat, message) {
        return new Promise(function (resolve, reject) {
            importPublicKey(keyInPemFormat).then(function (key) {
                crypto.encrypt(rsaParams, key, converterWrapper.str2abUtf8(message))
                    .then(function (encrypted) {
                        resolve(converterWrapper.arrayBufferToBase64String(encrypted));
                    });
            })
        });
    }

    function privateDecrypt(keyInPemFormat, encryptedBase64Message) {
        return new Promise(function (resolve, reject) {
            importPrivateKey(keyInPemFormat).then(function (key) {
                crypto.decrypt(rsaParams, key, converterWrapper.base64StringToArrayBuffer(encryptedBase64Message))
                    .then(function (decrypted) {
                        resolve(converterWrapper.arrayBufferToUtf8(decrypted));
                    });
            });
        });
    }

    function privateSign(keyInPemFormat, message) {
        return new Promise(function (resolve, reject) {
            importPrivateKey2(keyInPemFormat).then(function (key) {
                crypto.sign(rsaParams2, key, converterWrapper.str2abUtf8(message))
                    .then(function (encrypted) {
                        resolve(converterWrapper.arrayBufferToBase64String(encrypted));
                    });
            });
        });
    }

    function verify(keyInPemFormat, signature, data) {
        console.log("Chegou no verifica");
        return new Promise(function (resolve, reject) {
            importPrivateKey3(keyInPemFormat).then(function (key) {
                crypto.verify(rsaParams2, key, converterWrapper.base64StringToArrayBuffer(signature), data).then(function (bool) {
                    console.log(bool);
                    resolve(bool);
                })
            })
        })
    }

    window.rsaWrapper = {
        importPrivateKey: importPrivateKey,
        importPublicKey: importPublicKey,
        privateDecrypt: privateDecrypt,
        publicEncrypt: publicEncrypt,
        privateSign: privateSign,
        importPrivateKey2: importPrivateKey2,
        verify: verify,
        importPublicKey2: importPublicKey2,
    }

}());
