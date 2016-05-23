var fs    = require('fs');
var pg    = require("pg");

module.exports.generateSessionExirationDate = function (seconds) {

  var now = new Date();
  var offset = (now.getTimezoneOffset() * 60 * 1000 ) * -1;
  var date = new Date(now.getTime() + offset + (seconds * 1000));

  return date;
}

module.exports.getConfiguration = function (callback) {

  fs.readFile('configuration.json', 'utf8', function (err, data) {
    if(err){
      return callback(err)
    }

    try{
      configuration = JSON.parse(data);
    } catch (exception){
      return callback(exception)
    }

    return callback(null, configuration) 
  });
  
}

exports.setConfiguration = function (configuration, callback) {

  var configurationAsString =  JSON.stringify(configuration, null, 4);

  fs.writeFile('configuration.json', configurationAsString, function(err) {
    if(err) {
      return callback(err);
    } else {
      return callback(null);
    }
  }); 
}
