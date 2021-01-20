const port = 8080;
const WebSocket = require('ws');

const wss = new WebSocket.Server({port: port});

wss.on('connection', function connection(ws){
    ws.on('message', function incoming(message){
        ws.send('you sent: '+message);
    })
    ws.send('hello');
})

console.log(`signalling listening on port ${port}`);
