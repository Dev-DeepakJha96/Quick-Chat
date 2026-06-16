const express = require('express');

const router = express.Router();

/**
 * Health check endpoint — useful for load balancers, uptime monitors,
 * and container orchestration (k8s liveness/readiness probes).
 */


// ---------------------------------------------------------------
// Mount feature routes here as you build them, e.g.:
//
// const userRoutes = require('./user.routes');
// router.use('/users', userRoutes);
//
// const authRoutes = require('./auth.routes');
// router.use('/auth', authRoutes);
// ---------------------------------------------------------------

module.exports = router;