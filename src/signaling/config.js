module.exports = {
	get_turn_config: (userid) => {
		return {
			iceServers: [
				{
					urls: ["stun:stun.l.google.com:19302"]
				},
			]
		}
	}
}
