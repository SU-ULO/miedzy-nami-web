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
let players=new Map();

const maxplayers=1000;
const room_key_length=9;

function get_turn_config()
{
	return {
		iceServers:[
			{
				urls: ["stun:stun.l.google.com:19302"]
			}
		]
	}
}

function extract_cmd(cmd)
{
	let arr=cmd.split(':');
	if(arr.length<2) return '';
	arr.splice(0, 1);
	return arr.join(':');
}

function split_cmd(cmd)
{
	let arr=cmd.split(':');
	if(arr.length<2)
	{
		if(arr.length==0) return ['', ''];
		arr.push('');
		return arr;
	}
	let first=arr.splice(0, 1);
	first.push(arr.join(':'));
	return first;
}

function send_servers_refresh()
{
	let msg='LIST:'+JSON.stringify(listServers());
	players.forEach((p)=>{
		p.socket.send(msg);
	})
}

class Peer
{
	static default_config={}
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
	static parse_hello(hello)
	{
		return null;
	}
	generate_hello()
	{
		return {}
	}
}

class GameServer extends Peer
{
	static default_config={key: null}
	constructor(socket, config)
	{
		super(socket);
		this.key=config.key;
		this.connections=new Map();
	}
	open()
	{
		if(this.listed) return;
		super.open();
		servers.set(this.key, this);
		send_servers_refresh();
	}
	close()
	{
		if(!this.listed) return;
		super.close();
		servers.delete(this.key);
		this.connections.forEach((conn)=>{conn.close()})
		send_servers_refresh();
	}
	add_connection(conn)
	{
		let i=1;
		while(this.connections.has(i)) ++i;
		conn.id=i;
		this.connections.set(conn.id, conn);
		this.socket.send("JOIN:"+JSON.stringify({id: conn.id, webrtc: get_turn_config()}));
	}
	parse(msg)
	{
		if(msg.startsWith("LEAVE:"))
		{
			let id=parseInt(extract_cmd(msg));
			if(this.connections.has(id))
			{
				this.connections.get(id).close();
			}
			return;
		}
		if(msg.startsWith("CONNECTION:"))
		{
			msg=extract_cmd(msg);
			let id=parseInt(split_cmd(msg)[0]);
			if(this.connections.has(id))
			{
				this.connections.get(id).send_to_client(extract_cmd(msg));
			}else
			{
				this.socket.send("LEAVE:"+id);
			}
			return;
		}
		super.parse(msg);
	}
	generate_hello()
	{
		return {key: this.key}
	}
}

class Player extends Peer
{
	static default_config={id: null, username: null}
	constructor(socket, config)
	{
		super(socket);
		this.id=config.id;
		this.username=config.username;
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
		if(this.connection) this.connection.close();
	}
	join(server_key)
	{
		if(!servers.has(server_key))
		{
			this.socket.send("NO_SERVER");
			return;
		}
		let s = servers.get(server_key);
		this.connection = new Connection(s, this);
		s.add_connection(this.connection);
		this.socket.send("JOIN:"+JSON.stringify({key: s.key, webrtc: get_turn_config()}));
	}
	parse(msg)
	{
		if(msg=='LIST')
		{
			this.socket.send('LIST:'+JSON.stringify(listServers()));
			return true;
		}
		if(msg.startsWith('JOIN:'))
		{
			let cmd = extract_cmd(msg);
			this.join(cmd);
			return;
		}
		if(msg=="LEAVE")
		{
			if(this.connection) this.connection.close()
			return;
		}
		if(msg.startsWith("CONNECTION:"))
		{
			if(this.connection)
			{
				this.connection.send_to_server(extract_cmd(msg));
			}
			return;
		}
		super.parse(msg);
	}
	static parse_hello(hello)
	{
		let conf=this.default_config;
		let parsed;
		try
		{
			parsed=JSON.parse(hello);
		}
		catch(error)
		{
			return null;
		}
		if(parsed instanceof Object && parsed.hasOwnProperty("username"))
		{
			conf.username=parsed.username;
			return conf;
		}
		return null;
	}
	generate_hello()
	{
		return {}
	}
}

class Connection
{
	constructor(server, player)
	{
		this.id=null;
		this.server=server;
		this.player=player;
	}
	close()
	{
		if(this.id)
		{
			if(this.server)
			{
				this.server.socket.send("LEAVE:"+this.id);
				this.server.connections.delete(this.id);
			}
		}
		this.id=null;
		this.server=null;
		if(this.player)
		{
			this.player.socket.send("LEAVE");
		}
		this.player=null;
	}
	send_to_server(cmd)
	{
		if(this.server) this.server.socket.send("CONNECTION:"+this.id+":"+cmd);
	}
	send_to_client(cmd)
	{
		if(this.player) this.player.socket.send("CONNECTION:"+cmd);
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
		r=getRandomInt(0, parseInt("Z".repeat(room_key_length), 36)).toString(36).toUpperCase().padStart(room_key_length, "0");
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
		clientiter=(clientiter+1)%2000+1;
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
			ws.close(4000, "TIMEOUT");
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
			if(message.startsWith("SERVER"))
			{
				let k=genserverkey();
				if(k)
				{
					
					let conf;
					if(message.startsWith("SERVER:"))
					{
						conf=GameServer.parse_hello(extract_cmd(message));
					}else
					{
						conf=GameServer.default_config;
					}
					if(conf)
					{
						conf.key=k;
						peer=new GameServer(ws, conf);
						peer.open();
						ws.send("HELLO:"+JSON.stringify(peer.generate_hello()));
					}else
					{
						ws.close(4000, "WRONG_PARAMS");
					}
					
				}else
				{
					ws.close(4000, "FAILED_KEY_RAND");
				}
			}
			else if(message.startsWith("CLIENT:"))
			{
				if(players.size>=maxplayers)
				{
					ws.close(4000, "MAX_PLAYERS");
				}else
				{
					conf=Player.parse_hello(extract_cmd(message));
					if(conf)
					{
						conf.id = genplayerid();
						peer=new Player(ws, conf);
						peer.open();
						let hello=peer.generate_hello();
						if(hello=={})
						{
							ws.send("HELLO");
						}else
						{
							ws.send("HELLO"+JSON.stringify(hello));
						}
					}else
					{
						ws.close(4000, "WRONG_PARAMS");
					}
				}
			}else
			{
				ws.close(4000, "NO_OR_WRONG_TYPE");
			}
		}
	})
	ws.on('close', function closing(){
		clearTimeout(timeout);
		if(peer) peer.close();
	});
})

console.log(`signaling listening on port ${port}`);
