const port = 8080;
const WebSocket = require('ws');

const wss = new WebSocket.Server({port: port});

const heartbeat = setInterval(function ping(){
	wss.clients.forEach(function each(ws){
		if(!ws.isAlive) return ws.terminate();
		ws.isAlive=false;
		ws.ping();
	});
}, 5000);

let servers=new Map();
let players=new Map();

const maxplayers=1000;

class Peer
{
	constructor(socket)
	{
		this.socket=socket;
		this.listed=false;
	}
	open()
	{
		if(this.listed) return;
		this.listed=true;
	}
	close()
	{
		if(!this.listed) return;
		this.listed=false;
	}
	parse(msg)
	{
		return true;
	}
}

class GameServer extends Peer
{
	constructor(socket, key)
	{
		super(socket);
		this.key=key;
	}
	open()
	{
		if(this.listed) return;
		super.open();
		servers.set(this.key, this);
	}
	close()
	{
		if(!this.listed) return;
		super.close();
		servers.delete(this.key);
	}
	parse(msg)
	{
		return super.parse(msg);
	}
}

class Player extends Peer
{
	constructor(socket, id)
	{
		super(socket);
		this.id=id;
	}
	open()
	{
		if(this.listed) return;
		super.open();
		players.set(this.id, this);
	}
	close()
	{
		if(!this.listed) return;
		super.close();
		players.delete(this.id);
	}
	parse(msg)
	{
		let ch=msg.charAt(0);
		if(ch=='L')
		{
			this.socket.send('L:'+JSON.stringify(listServers()));
			return true;
		}
		return false;
	}
}

function listServers()
{
	let arr=[];
	for(let val of servers.values())
	{
		arr.push({key: val.key});
	}
	return arr;
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
	while(servers.has(r)||tries<=100)
	if(servers.has(r)) return false;
	return r;
}

let clientiter=0;
function genplayerid()
{
	do
	{
		clientiter=(clientiter+1)%2001;
	}
	while(players.has(clientiter));
	return clientiter;
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
	}, 2000)
	ws.on('message', function incoming(message){
		if(typeof message !='string') ws.close();
		if(message.length==0) ws.close();
		if(peer)
		{
			if(!peer.parse(message)) ws.close();
		}else
		{
			if(message==="s"||message==="S")
			{
				let k=genserverkey();
				if(k)
				{
					peer=new GameServer(ws, k);
					peer.open();
					ws.send("K:"+peer.key);
				}else
				{
					ws.send("!R");
					ws.close();
				}
			}
			else if(message==="c"||message==="C")
			{
				if(players.size>=maxplayers)
				{
					ws.send("!M");
					ws.close();
				}else
				{
					peer=new Player(ws, genplayerid());
					peer.open();
				}
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
