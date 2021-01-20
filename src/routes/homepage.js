const express = require('express');
const router = express.Router();
const nocache = require('nocache');

router.use(nocache());

router.get('/', (req, res) => {
    res.render('homepage');
})

module.exports = router;
