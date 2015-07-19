var groupController = require('../groups/groupController.js');
var userController = require('../users/userController.js');
var multiparty = require('multiparty');

module.exports = function (app) {
  app.post('/twilio', function (req, res){
    userController.findByPhone(req.body.From.slice(2), function (user) {
      req.user = user;
      if (req.user) {
        if (req.body.Body.slice(0,5).toUpperCase() === "JOIN ") {
          var messageBody = req.body.Body.split(' ');
          groupController.find(messageBody[1], function (group) {
            // joining private group
            if (group.key) {
              if (messageBody[2] === group.key) {
                req.group = group;
                req.body.username = user.username;
                groupController.joinPing(req, res);
                groupController.join(req, res);
              } else {
                var callerNumber = req.body.From.slice(2);
                clients.sendSMS('This group is private! Please respond with "join ' + group.name + ' <key>"', callerNumber);
                res.end('Joining group failed');
              }
            // joining public group
            } else {
              req.group = group;
              req.body.username = user.username;
              // send ping notice to everyone in the group
              groupController.joinPing(req, res);
              groupController.join(req, res);
            }
          });
        } else if (req.body.Body.slice(0,7).toUpperCase() === "CREATE ") {
          var messageBody = req.body.Body.split(' ');
          // creating private group
          if (messageBody[2]) {
            req.body = {
              'name': messageBody[1],
              'username': req.user.username,
              'key': messageBody[2].toString()
            };
          // creating public group
          } else {
            req.body = {
              'name': messageBody[1],
              'username': req.user.username,
              'key': null
            };
          }
          groupController.create(req, res);

        // } else if (req.body.Body === "BROWSE"){
        //   groupController.browse(req, res);

        // } else if (req.body.body.slice(0,7).toUpperCase() === "SIGNUP ") {
        //   TODO: prompt user info via sms
        //   userController.signup(req, res);

        // functionality to leave group via SMS
        } else if (req.body.Body.slice(0,6).toUpperCase() === "LEAVE ") {
          groupController.find(req.body.Body.slice(6), function (group) {
            req.group = group;
            user.leaveGroup(req, res);
          });

        // functionality to invite members
        } else if(req.body.Body.slice(0,7).toUpperCase() === "INVITE "){
          var messageBody = req.body.Body.split(' ');
          var inviteeNumber = messageBody[2];

          groupController.find(messageBody[1], function (group) {
            req.group = group;
            req.body.username = user.username;
            req.body.inviteeNumber = inviteeNumber;
            req.body.key = group.key;
            groupController.invite(req, res);
          });

        } else {
          var smsBody = req.body.Body.toLowerCase();
          if(req.body.Body[0] === '@') {
            var where = {name: smsBody.slice(1, smsBody.indexOf(' '))};
          } else {
            var where = {id: req.user.lastMessageGroup};
          }
          groupController.find(where, function (group) {
            req.group = group;
            groupController.ping(req, res);
          });
        }
      } else {
        // functionality to signup via SMS
        if (req.body.Body.slice(0,7).toUpperCase() === "SIGNUP ") {
          var messageBody = req.body.Body.split(' ');
          var newPhoneNum = req.body.From.slice(2);
          var newUsername = messageBody[1];
          var newEmail = messageBody[2];
          var errorHandler = function(err){
            if(err) {
              throw err;
            }
          };
          req.body.username = newUsername;
          req.body.email = newEmail;
          req.body.phone = newPhoneNum;

          userController.signup(req,res,errorHandler);

        } else {
          // send instructions on how to signup if the number is not registered
          var newPhoneNum = req.body.From.slice(2);
          var signupMessage = 'To join GuacFriends, please respond to this message with "signup <username> <email>"';
          clients.sendSMS(signupMessage,newPhoneNum);
          res.end('Thanks for signing up!');
        }
      }
    });
  });

  app.post('/sendgrid', function (req, res) {
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
      var start = fields.from[0].indexOf('<');
      var end = fields.from[0].indexOf('>');
      userController.findByEmail(fields.from[0].slice(start + 1, end), function (user) {
        req.user = user;

        if (fields.subject[0].slice(0,5).toUpperCase() === "JOIN ") {
          groupController.find({name: fields.subject[0].slice(5)}, function (group) {
            req.group = group;
            req.body.username = user.username;
            groupController.join(req, res);
          });

        } else if (fields.subject[0].slice(0,7).toUpperCase() === "CREATE ") {
          req.body = {
            'name': fields.subject[0].slice(7),
            'username': req.user.username
          };
          groupController.create(req, res);

        // } else if (fields.subject[0].slice(0,7).toUpperCase() === "BROWSE"){
        //   groupController.browse(req, res);

        } else {
          groupController.find({name: fields.subject[0].toLowerCase()}, function (group) {
            req.group = group;
            groupController.ping(req, res);
          });
        }
      });
    });
  });
};
