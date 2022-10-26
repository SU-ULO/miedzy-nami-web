# Między Nami server
Matchmaking server for [Między Nami](https://github.com/SU-ULO/miedzy-nami)

## Deployment
Deployment is done using docker.

### STUN/TURN
By default game uses Google's STUN servers for establishing WebRTC connection.
To change this provide custom `config.js` file.
For example:
```js
const crypto = require('crypto');

module.exports = {
	get_turn_config: (userid) => {
		userid = (parseInt(Date.now() / 1000) + 3600) + ':' + userid
		return {
			iceServers: [
				{
					urls: ["stun:stun.l.google.com:19302"]
				},
				{
					urls: ["turn:your-turn-server:port"],
					username: userid,
					credential: crypto.createHmac('sha1', process.env.TURN_SECRET).update(userid).digest('base64')
				}
			]
		}
	}
}
```
And mount it at location `/usr/src/app/signaling/config.js` in the contatiner.
Exact implementation will depend on configuration of your STUN/TURN servers.

### API
To mark game rooms as official you have to set `ADMIN_SECRET` environment variable and use `verify.py` modified with your values (or manually send HTTP request to `/roomverification` route on the server).
