var Group = require('./groupModel.js');
//require('../db/relationshipModel.js'); // sets up many-to-many relationship
require('../db/pingModel.js'); // sets up Pings table
var clients = require('../clients/clientController.js');
var Location = require('../location/locationModel.js');

module.exports = {
  parseGroupUrl: function (req, res, next, groupName) {
    module.exports.find({name: groupName}, function (group) {
      req.group = group;
      next();
    });
  },

  find: function (whereCriteria, callback) {
    Group.findOne({where: whereCriteria})
    .then(function (group) {
      if (!group) {
        console.log('user is searching for ' + groupName + ', but not in database');
      } else {
        if (callback) {
          callback(group);
        } else {
          return group;
        }
      }
    });
  },

  browse: function (req, res) {
    Group.findAll()
    .then(function (groups) {
      res.end(JSON.stringify(groups));
    });
  },

  nearby: function(req, res) {
    var coords = [req.query.longitude, req.query.latitude];
    Location.find({location : {
      $near : {
        $geometry : {
          type : 'Point',
          coordinates : coords
        },
        $maxDistance : 1000
        }
      }
    }).exec()
    .then(function (groups) {
      res.end(JSON.stringify(groups));
    });
  },

  create: function (req, res) {
    var group = req.body;
    console.dir(group);

    var newGroup = Group.build(group);
    newGroup.save()
    .then(function (result) {
      require('../users/userController.js').findByPhone(req.body.phone, function(user) {
        user.addGroup(newGroup.id).then(function (result) {
          var doc = {
            physicalAddress: group.physicalAddress,
            name: group.name,
            phone: group.name,
            location: {
              coordinates: [group.longitude, group.latitude]
            }
          };
          console.dir(doc);
          Location.create(doc).then(function (err, result) {
            console.log('fuck yeah');
            console.dir(result);
            res.end(JSON.stringify(result));
          });
        });
      });
    });
  },

  members: function (req, res) {
    req.group.getUsers()
    .then(function (users) {
      res.end(JSON.stringify(users));
    });
  },

  join: function (req, res) {
    // TODO: security concern that username is coming from POST request. Easy to forge
    require('../users/userModel.js').findOne({where: {phone: req.body.phone}})
    .then(function (user) {
      user.addGroup(req.group.id)
      .then(function (result) {
        res.end(JSON.stringify(result));
      })
      .catch(function (err) {
        console.log(err);
      });
    });
  },

  history: function (req, res) {
    req.group.getPings()
    .then(function (pings) {
      res.end(JSON.stringify(pings));
    });
  },

  ping: function (req, res) {
    if (req.user) {
      req.body.phone = req.user.phone;  // lame hack to not fail on username lookup if already done (i.e. Twilio)
    }

    require('../users/userController.js').findByPhone(req.body.phone, function(user) {
      req.user = user;
      req.group.createPing({UserId: req.user.id});
      console.log('pinged');
      req.group.getUsers()
      .then(function (users) {
        users.forEach(function (user) {
          clients.sendSMS(req.user.username + ' says: ' + req.body.Body, user.phone);
          // clients.sendEmail('Why don't we get together for some ' + req.group.name + ' today?', req.user.username + ' invited you! Just reply to this message to update ' + req.user.username + ' on your status.', user.email, req.user.email);
          user.set('lastMessageGroup', req.group.id).save();
        });
        res.end('Pinged ' + users.length + ' members of ' + req.group.name);
      });
    });
  },

  joinPing: function(req, res) {
    if (req.user) {
      req.body.username = req.user.username;  // lame hack to not fail on username lookup if already done (i.e. Twilio)
    }
    req.group.createPing({UserId: req.user.id});
    req.group.getUsers()
    .then(function (users) {
      users.forEach(function(user) {
        clients.sendSMS(req.body.username + " has just joined " + req.group.name + "!", user.phone);
      });
      res.end('New user joined group!');
    });
  },

  invite: function(req, res){
    require('../users/userController.js').findByPhone(req.body.inviteeNumber, function(user) {
      req.group.createPing({UserId: req.user.id});
      var groupCredentials;
      if (req.body.key) {
        groupCredentials = req.group.name + ' ' + req.body.key;
      } else {
        groupCredentials = req.group.name;
      }
      clients.sendSMS(req.body.username + ' invited you to join ' + req.group.name + '! Reply with "join ' + groupCredentials + '" to join group.', req.body.inviteeNumber);
      res.end('Invite sent!');
    });
  }
};
