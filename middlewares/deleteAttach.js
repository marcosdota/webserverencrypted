//  multer - Deletar arquivo inválido

const fs = require('fs');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);

const deleteAttach = async (attachPath) => {
  if (!attachPath) return;
  await unlinkAsync(attachPath);
};

module.exports = deleteAttach;