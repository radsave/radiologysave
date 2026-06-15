const router = require('express').Router();
const { searchCenters, getModalities, getBodyParts, getProtocols } = require('../controllers/search.controller');
router.get('/', searchCenters);
router.get('/modalities', getModalities);
router.get('/body-parts', getBodyParts);
router.get('/protocols', getProtocols);
module.exports = router;
