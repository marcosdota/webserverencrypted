
const { downloads } = require('./sessions');

module.exports = {

    blockRoute(req, res, next) {
        console.log("URL: " + req.originalUrl);
        if ((req.originalUrl.indexOf('/encrypt') === -1)) {
            return res.status(401).json({ message: 'Não autorizado acesso a esse arquivo! 1' });
        }
        if (downloads.has(req.sessionID)) {
            file = downloads.get(req.sessionID);
            if (file.indexOf(req.url) === -1)
                return res.status(401).json({ message: 'Não autorizado acesso a esse arquivo! 2' });
            else {
                next();
            }
        }
        else
            return res.status(401).json({ message: 'Não autorizado acesso a esse arquivo! 3' });

    }
}