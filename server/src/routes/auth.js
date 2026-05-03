const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        console.log('Google Auth successful for user:', req.user.username);
        res.redirect('/');
    }
);

router.get('/guest', (req, res, next) => {
    passport.authenticate('mock', (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Guest login not available' });
        req.logIn(user, (err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    })(req, res, next);
});

router.get('/me', (req, res) => {
    if (req.user) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ user: null });
    }
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
