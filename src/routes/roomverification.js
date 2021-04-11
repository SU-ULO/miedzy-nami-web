const path = require('path');
const crypto = require("crypto")
const express = require('express');
const router = express.Router();
const nocache = require('nocache');

const signaling = require(path.join(__dirname, '..', 'signaling', 'signaling.js'));

router.use(express.text({ type: '*/*' }));

router.post('/', (req, res) => {
	if(typeof req.body != "string")
	{
		res.status(400).send();
		return;
	}
	let arr = req.body.split(".");
	if (arr.length != 2) {
		res.status(400).send();
		return;
	}
	let r = new Buffer.from(arr[0], 'base64');
	r = r.toString();
	try {
		r = JSON.parse(r);
	} catch (e) {
		res.status(400).send();
		return;
	}
	if(!Array.isArray(r))
	{
		res.status(400).send();
		return;
	}
	if(crypto.createHmac('sha1', process.env.ADMIN_SECRET).update(arr[0]).digest('base64')!=arr[1])
	{
		res.status(403).send();
		return;
	}
	signaling.verifyrooms(r);
	res.status(204).send();
})

module.exports = router;