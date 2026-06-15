const router = require('express').Router();
const dir = require('../controllers/directory.controller');

router.get('/centers', dir.listCenters);
router.get('/centers/:slug', dir.getCenter);
router.get('/procedures', dir.listProcedures);
router.get('/procedures/:slug', dir.getProcedure);

module.exports = router;
