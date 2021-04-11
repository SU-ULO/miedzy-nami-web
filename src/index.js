const path = require('path');
const express = require('express');
const nocache = require('nocache');
const app = express();
const port = 80;

const signaling = require(path.join(__dirname, 'signaling', 'signaling.js'));

app.disable('x-powered-by');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, "views"));
app.use('/static', express.static(path.join(__dirname, 'static')));

app.use(nocache());
app.disable('etag');

const homepage = require(path.join(__dirname, 'routes', 'homepage.js'));
const roomverification = require(path.join(__dirname, 'routes', 'roomverification.js'));

app.use('/', homepage);
app.use('/roomverification', roomverification);

app.listen(port, () => {
	console.log(`miedzy-nami-web listening on port ${port}`);
})
