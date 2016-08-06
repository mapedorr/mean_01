// load required modules
var mongoose = require('mongoose');

// create the mongoose schema for Post's model
var PostSchema = new mongoose.Schema({
  title: String,
  link: String,
  upvotes: {type: Number, default: 0},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
});

PostSchema.methods.upvote = function (cb) {
  this.upvotes++;
  this.save(cb);
};

// register the Post model in the global Mongoose object so other files can access
// the model when Mongoose is imported
module.exports = mongoose.model('Post', PostSchema);