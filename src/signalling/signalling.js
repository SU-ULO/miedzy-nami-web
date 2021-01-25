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

function get_turn_config()
{
	return {
		iceServers:[
			{
				urls: ["stun:stun.l.google.com:19302"]
			},
			{
				urls: ["turn:rakbook.pl:3478"],
				username: "test",
				credential: "test123"
			}
		]
	}
}

function split_cmd(cmd)
{
	let arr=cmd.split(':');
	if(arr.length<2) return '';
	arr.splice(0, 1);
	return arr.join(':');
}

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
		ws.close(4000, "PARSING_FAILED");
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
		super.parse(msg);
	}
}

class Player extends Peer
{
	constructor(socket, id)
	{
		super(socket);
		this.id=id;
		this.connection=null;
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
		if(msg=='L')
		{
			this.socket.send('L:'+JSON.stringify(listServers()));
			return true;
		}
		super.parse(msg);
	}
}

class Connection
{
	constructor()
	{
		this.server=null;
		this.player=null;
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
	}, 1000)
	ws.on('message', function incoming(message){
		if(typeof message !='string') ws.close();
		if(message.length==0) ws.close();
		if(peer)
		{
			peer.parse(message)
		}else
		{
			if(message.startsWith("S"))
			{
				let k=genserverkey();
				if(k)
				{
					peer=new GameServer(ws, k);
					peer.open();
					ws.send("K:"+peer.key);
					if(message.startsWith("S:"))
					{
						peer.parse(message);
					}
				}else
				{
					ws.close(4000, "FAILED_KEY_GEN");
				}
			}
			else if(message.startsWith("C"))
			{
				if(players.size>=maxplayers)
				{
					ws.close(4000, "MAX_PLAYERS");
				}else
				{
					peer=new Player(ws, genplayerid());
					peer.open();
					if(message.startsWith("C:"))
					{
						peer.parse(message);
					}
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
