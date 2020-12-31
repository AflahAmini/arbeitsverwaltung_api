const ws = require('ws');

const wsServer = new ws.Server({ noServer: true });

wsServer.on('connection', ws => {
    console.log('Connection attempt.');

    ws.on('message', message => { 
        console.log(message);
        wsServer.clients.forEach( client => {
            if (client.readyState === ws.OPEN) {
                client.send(message);
                console.log("Sending to all clients.");
            }
        });
    });
});

module.exports = wsServer;