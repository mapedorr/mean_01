var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

passport.use(new LocalStrategy(
  function (username, password, done) {
    User.findOne({username: username}, function (err, userInDB) {
      if (err) return done(err);
      if (!userInDB) return done(null, false, {message: 'Incorrect username.'});
      if (!userInDB.validPassword(password)) return done(null, false, {message: 'Incorrect password'});
      return done(null, userInDB);
    });
  }
));