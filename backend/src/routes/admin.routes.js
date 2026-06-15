const router = require('express').Router();
const admin = require('../controllers/admin.controller');
const { confirmAppointment } = require('../controllers/appointment.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', admin.getDashboardStats);

// Imaging Centers
router.get('/centers', admin.getCenters);
router.get('/centers/:id', admin.getCenter);
router.post('/centers', admin.createCenter);
router.put('/centers/:id', admin.updateCenter);
router.delete('/centers/:id', admin.deleteCenter);

// Center Pricing
router.get('/centers/:id/pricing', admin.getCenterPricing);
router.post('/centers/:id/pricing', admin.upsertPricing);
router.put('/centers/:id/pricing/bulk', admin.bulkUpdatePricing);
router.post('/centers/:id/publish-pricing', admin.publishPricing);

// Appointments
router.get('/appointments', admin.getAppointments);
router.post('/appointments/:id/confirm', confirmAppointment);
router.patch('/appointments/:id/status', admin.updateAppointmentStatus);

// Users
router.get('/users', admin.getUsers);
router.patch('/users/:id/role', admin.promoteUser);

module.exports = router;
