var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Post = require('../models/PostModel');
var Comment = require('../models/CommentModel');
var User = require('../models/UserModel');
var passport = require('passport');
var jwt = require('express-jwt');

// create a middleware for authenticating jwt tokens
// >> the userPropery option specifies which property on req to put our payload from our tokens
var auth = jwt({secret: 'SECRET', userProperty: 'payload'});



// ------------------------------
// router params
// ------------------------------

// automatically load a Post from DB when the parameter with name 'post' is
// received in any of the routes defined for this router.
// e.g. router.get('/posts/:post'...
router.param('post', function (req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function (err, postInDB) {
    if (err) return next(err);
    if (!postInDB) return next(new Error("can't find post"));

    // save the obtained object in a property of the request object
    req.post = postInDB;
    return next();
  });
});

router.param('comment', function (req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function (err, commentInDB) {
    if (err) return next(err);
    if (!commentInDB) return next(new Error("can't find comment"));

    req.comment = commentInDB;
    return next();
  });
});


// ------------------------------
// routes of general purpose
// ------------------------------

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// ------------------------------
// routes related with Post model
// ------------------------------

router.get('/posts', function(req, res, next) {
  Post.find(function (err, postsInDB) {
    if (err) return next(err);
    res.json(postsInDB);
  });
});

router.post('/posts', auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username;

  post.save(function (err, postInDB) {
    if (err) return next(err);
    res.json(postInDB);
  });
});

router.get('/posts/:post', function(req, res, next) {
  // get the data from the property set in the router.param
  req.post.populate('comments', function (err, postInDB) {
    if (err) return next(err);

    res.json(req.post);
  });
});

router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function (err, postInDB) {
    if (err) return next(err);
    res.json(postInDB);
  });
});

// ------------------------------
// routes related with Comment model
// ------------------------------

router.post('/posts/:post/comments', auth, function (req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username;

  comment.save(function (err, commentInDB) {
    if (err) return next(err);

    req.post.comments.push(comment);
    req.post.save(function (err, postInDB) {
      if (err) return next(err);

      res.json(comment);
    });
  });
});

router.put('/posts/:post/comments/:comment/upvote', auth, function (req, res, next) {
  req.comment.upvote(function (err, postInDB) {
    if (err) return next(err);
    res.json(postInDB);
  });
});

// ------------------------------
// routes related with User model
// ------------------------------

router.post('/register', function (req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({message: 'Please fill out all fields.'});
  }

  var user = new User();

  user.username = req.body.username;
  user.setPassword(req.body.password);
  user.save(function (err) {
    if (err) return next(err);
    return res.json({token: user.generateJWT()});
  });
});

router.post('/login', function (req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({message: 'Please fill out all fields.'});
  }

  passport.authenticate('local', function (err, user, info) {
    if (err) return next(err);
    if (user) return res.json({token: user.generateJWT()});
    else res.status(401).json(info);
  })(req, res, next);
});

module.exports = router;