const port = 8080;
const WebSocket = require('ws');

const wss = new WebSocket.Server({port: port});

const heartbeat = setInterval(function ping(){
	wss.clients.forEach(function each(ws){
		if(!ws.isAlive) return ws.terminate();
		ws.isAlive=false;
		ws.ping();
	});
}, 10000);

let servers=new Map();
let clients=new Map();

class Peer
{
	constructor(socket)
	{
		this.socket=socket;
	}
	close(){}
}

class GameServer extends Peer
{
	constructor(socket, key)
	{
		super(socket);
		this.key=key;
	}
	close()
	{
		super.close();
		servers.delete(this.key);
	}
}

class Player extends Peer
{
	constructor(socket, id)
	{
		super(socket);
		this.id=id;
	}
}

function getRandomInt(min, max){
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}
  

function genserverkey()
{
	let tries=0;
	let r;
	do{
		r=getRandomInt(0, parseInt("ZZZZZZZZZ", 36)).toString(36).toUpperCase();
		++tries;
	}
	while(servers.has(r)||tries<=20)
	if(servers.has(r)) return false;
	return r;
}

wss.on('connection', function connection(ws){
	ws.isAlive=true;
	ws.on('pong', function (){
		ws.isAlive=true;
	})
	let peer=null;
	let timeout = setTimeout(function ()
	{
		if(peer===null)
		{
			ws.close();
		}
	}, 10000)
	ws.on('message', function incoming(message){
		if(peer)
		{

		}else
		{
			if(message==="s"||message==="S")
			{
				let k=genserverkey();
				if(k)
				{
					peer=new GameServer(ws, k);
					servers.set(peer.key, peer);
					ws.send(peer.key);
				}else
				{
					ws.close();
				}
			}
			else if(message==="c"||message==="C")
			{
				ws.close();
			}else
			{
				ws.close();
			}
		}
	})
	ws.on('close', function closing(){
		clearTimeout(timeout);
		if(peer) peer.close();
	});
})

console.log(`signalling listening on port ${port}`);
