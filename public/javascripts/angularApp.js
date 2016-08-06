// create the angular application
var app = angular.module('flapperNews', [
  'ui.router' //ui-router is newer and provides more flexibility and features than ngRoute
]);


// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// configuration
// -----------------------------------------------------------------------------

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  function ($stateProvider, $urlRouterProvider) {
    // the content of the state will be rendered inside the <ui-view> directive
    $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: '/home.html',
        controller: 'MainCtrl',
        // by using the resolve property in this way, we are ensuring that
        // anytime our home state is entered, we will automatically query all
        // posts from our backend before the state actually finishes loading
        // https://github.com/angular-ui/ui-router/wiki#resolve
        resolve: {
          postPromise: ['postsService', function (_obj) {
            return _obj.getAll();
          }]
        }
      })
      .state('posts', {
        url: '/posts/{id}', // id will be a route parameter
        templateUrl: '/posts.html',
        controller: 'PostsCtrl',
        resolve: {
          postInDB: ['$stateParams', 'postsService', function ($stateParams, _obj) {
            return _obj.getPost($stateParams.id);
          }]
        }
      })
      .state('login', {
        url: '/login',
        templateUrl: '/login.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function ($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go('home');
          }
        }]
      })
      .state('register', {
        url: '/register',
        templateUrl: '/register.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function ($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go('home');
          }
        }]
      });

    // define what should happen if the app receives a URL that is not defined
    $urlRouterProvider.otherwise('home');
  }
]);


// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// services
// -----------------------------------------------------------------------------

// add the service that will send posts to the database
app.factory('postsService', ['$http', 'auth', function ($http, auth) {
  var _obj = {
    posts: []
  };

  _obj.getAll = function () {
    return $http.get('/posts').success(function (data) {
        // it's important to use the angular.copy() method to create a deep copy
        // of the returned data. This ensures that the $scope.posts variable in
        // MainCtrl will also be updated, ensuring the new values are reflect
        // in our view.
        angular.copy(data, _obj.posts);
      });
  };

  _obj.create = function (post) {
    return $http.post('/posts',
      post,
      { headers: {Authorization: 'Bearer '+auth.getToken()} })
      .success(function (data) {
        _obj.posts.push(data);
      });
  };

  _obj.upvote = function (post) {
    return $http.put('/posts/' + post._id + '/upvote',
      null,
      { headers: {Authorization: 'Bearer '+auth.getToken()} })
      .success(function (data) {
        post.upvotes++;
      });
  };

  _obj.getPost = function (id) {
    return $http.get('/posts/' + id).then(function (res) {
      return res.data;
    });
  };

  _obj.addComment = function (id, comment) {
    return $http.post('/posts/' + id + '/comments',
      comment,
      { headers: {Authorization: 'Bearer '+auth.getToken()} });
  };

  _obj.upvoteComment = function (post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote',
      null,
      { headers: {Authorization: 'Bearer '+auth.getToken()} })
      .success(function (data) {
        comment.upvote++;
      });
  };

  return _obj;
}])
.factory('auth', ['$http', '$window', function ($http, $window) {
  var auth = {};

  auth.saveToken = function (token) {
    $window.localStorage['flapper-news-token'] = token;
  };

  auth.getToken = function () {
    return $window.localStorage['flapper-news-token'];
  };

  auth.isLoggedIn = function () {
    var token = auth.getToken();

    if (token) {
      // the payload is the middle part of the token between the two .s.
      // it's a JSON object that has base64.
      // we can get it back to a stringified JSON by using $window.atob(),
      // and then back to a javascript object with JSON.parse
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    }
    else {
      return false;
    }
  };

  auth.currentUser = function () {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.username;
    }
  };

  auth.register = function (user) {
    return $http.post('/register', user).success(function (data) {
      auth.saveToken(data.token);
    });
  };

  auth.logIn = function (user) {
    return $http.post('/login', user).success(function (data) {
      auth.saveToken(data.token);
    });
  };

  auth.logOut = function () {
    $window.localStorage.removeItem('flapper-news-token');
  };

  return auth;
}]);


// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// controllers
// -----------------------------------------------------------------------------

// add the Main controller to the created angular application
app.controller('MainCtrl', [
  '$scope',
  'postsService',
  'auth',
  function ($scope, postsService, auth) {
    // --------------------
    // controller variables
    // --------------------
    $scope.title = '';
    $scope.link = '';
    $scope.posts = postsService.posts;
    $scope.isLoggedIn = auth.isLoggedIn;

    // --------------------
    // controller functions
    // --------------------
    $scope.addPost = function () {
      if (!$scope.title || $scope.title === '') return;
      postsService.create({
        title: $scope.title,
        link: $scope.link
        // upvotes: 0,
        // comments: [
        //   { author: 'Joe', body: 'Cool post!', upvotes: 0 },
        //   { author: 'Bob', body: 'Great idea but everything is wrong!', upvotes: 0 }
        // ]
      });
      $scope.title = '';
      $scope.link = '';
    };

    $scope.incrementUpvotes = function (post) {
      postsService.upvote(post);
    };

  }
]);

app.controller('PostsCtrl', [
  '$scope',
  'postsService',
  'postInDB',
  'auth',
  function ($scope, postsService, postInDB, auth) {
    // --------------------
    // controller variables
    // --------------------
    $scope.post = postInDB;
    $scope.body = '';
    $scope.isLoggedIn = auth.isLoggedIn;

    // --------------------
    // controller functions
    // --------------------
    $scope.addComment = function () {
      if (!$scope.body || $scope.body === '') return;
      postsService.addComment($scope.post._id, {
        body: $scope.body,
        author: 'user'
      }).success(function (commentInDB) {
        $scope.post.comments.push(commentInDB);
      });

      $scope.body = '';
    };

    $scope.incrementUpvotes = function (comment) {
      postsService.upvoteComment($scope.post, comment);
    };
  }
]);

app.controller('AuthCtrl', [
  '$scope',
  '$state',
  'auth',
  function ($scope, $state, auth) {
    $scope.user = {};

    $scope.register = function () {
      auth.register($scope.user).error(function (err) {
        $scope.error = err;
      }).then(function () {
        $state.go('home');
      });
    };

    $scope.logIn = function () {
      auth.logIn($scope.user).error(function (err) {
        $scope.error = err;
      }).then(function () {
        $state.go('home');
      });
    };
  }
]);

app.controller('NavCtrl', ['$scope', 'auth', function ($scope, auth) {
  $scope.isLOggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
}]);