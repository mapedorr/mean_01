var mongoose = require('mongoose');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

var UserSchema = new mongoose.Schema({
  username: {type:String, lowercase: true, unique: true},
  hash: String,
  salt: String
});

UserSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  // the pbkdf2Sync() function takes four parameters: password, salt,
  // iterations, and key length
  this.hash = crypto.pbkd2Sync(password, this.salt, 1000, 64).toString('hex');
};

UserSchema.methods.validPassword = function (password) {
  var hash = crypto.pbkd2Sync(password, this.salt, 1000, 64).toString('hex');
  return this.hash = hash;
};

UserSchema.methods.generateJWT = function () {
  // set expiration to 60 days
  var today = new Date();
  var expDay = new Date(today);
  expDay.setDate(today.getDate() + 60);

  // > the first argument of the jwt.sign() method is the payload that gets signed.
  //   both the server and client will have access to the payload
  // > the exp value in the payload is a Unix timestamp in seconds that will
  //   specify when the token expires
  // > the second argument of jwt.sign() is the secret used to sign our tokens.
  return jwt.sign({
    _id: this._id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000)
  }, 'SECRET');
};

module.export = mongoose.model('User', UserSchema);