var request  = require('request');
var settings = require('./settings.js');
var j = {
  get: function(endpoint, callback) {
    request(settings.apiUrl + endpoint, callback);
  }
};

module.exports = j;
