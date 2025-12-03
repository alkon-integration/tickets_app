const express = require('express');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    res.json({
      message: 'Login endpoint - to be implemented'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
