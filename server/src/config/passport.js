const GoogleStrategy = require('passport-google-oauth20').Strategy;
const CustomStrategy = require('passport-custom').Strategy;

module.exports = function(passport) {
    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        done(null, user);
    });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log(`OAuth Check: CLIENT_ID starts with "${clientId ? clientId.substring(0, 10) + '...' : 'NOT SET'}"`);

    if (clientId && clientId !== 'mock_id' && clientSecret && clientSecret !== 'mock_secret') {
        console.log('Registering Google OAuth Strategy...');
        passport.use(new GoogleStrategy({
            clientID: clientId,
            clientSecret: clientSecret,
            callbackURL: `http://localhost:${process.env.PORT || 5000}/auth/google/callback`
        }, (accessToken, refreshToken, profile, done) => {
            return done(null, {
                id: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value
            });
        }));
    }

    // Always register Mock Strategy for Guest Login / Testing
    passport.use('mock', new CustomStrategy((req, done) => {
        done(null, { id: 'mock_user_123', displayName: 'Guest User', email: 'guest@example.com' });
    }));
};
