const url = require('url');

const wsServer = require('../controllers/socketsController');
const authController = require('../controllers/authController');

function handleSockets(req, socket, head) {
    const pathname = url.parse(req.url).pathname;
    const authHeader = req.headers.authorization;

    authController.verifyToken(authHeader)
        .then(user => {
            if(!user)
                throw new Error('User is undefined');

            if (pathname === '/sockets') {
                wsServer.handleUpgrade(req, socket, head, ws => {
                    wsServer.emit('connection', ws, req);
                });
            }

        }).catch(err => {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        });
}

module.exports = handleSockets;