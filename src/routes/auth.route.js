const express = require('express');
const router = express.Router();
const { 
    VERIFY_GOOGLE_ID_TOKEN,
    GET_PROFILE,
    ROTATE_REFRESH_TOKEN,
    LOGOUT
} = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');


router.post("/google-auth", VERIFY_GOOGLE_ID_TOKEN);
router.post("/refresh-token", ROTATE_REFRESH_TOKEN);
router.post("/logout", authenticate, LOGOUT);
router.post("/profile", authenticate, GET_PROFILE);
module.exports = router;