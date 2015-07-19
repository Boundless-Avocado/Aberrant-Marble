var db = require('../db/index.js');
var Sequelize = require('sequelize');

var Group = db.define('Groups', {
  name: {type: Sequelize.STRING, unique: true, allowNull: false},
  // key for private groups
  key: {type: Sequelize.STRING, unique: false, allowNull: true}
});

Group.sync();

module.exports = Group;
