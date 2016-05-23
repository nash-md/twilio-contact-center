var fs    = require('fs')
var pg    = require("pg")

module.exports.generateSessionExirationDate = function (seconds) {

  var now = new Date()
  var offset = (now.getTimezoneOffset() * 60 * 1000 ) * -1
  var date = new Date(now.getTime() + offset + (seconds * 1000))

  return date
}

module.exports.getConfiguration = function (callback) {

  pg.connect(process.env.DATABASE_URL, function(error, client, done) {

    client.query('SELECT * FROM configuration', function(error, result) { 

      done()

      if (error){ 

        callback(error)

      }else{

        if(result.rows.length != 0){

          callback(null, JSON.parse(result.rows[0].data))
          
        } else {

          callback(new Error('configuration database is empty'))

        }
        
      }

    })

  })
  
}

exports.setConfiguration = function (configuration, callback) {

  var configurationAsString =  JSON.stringify(configuration, null, 4)

  pg.connect(process.env.DATABASE_URL, function(error, client, done) {

    client.query("TRUNCATE configuration", function(error, result) {
      
      if (error){ 
        return callback(error)
      }else{

        client.query("INSERT INTO configuration(data) values($1)", [configurationAsString], function(err, result) {
          done()
          if (err){ 
            callback(error)
          }else{
            callback(null)
          }
        })
        
      }
    })
  })
}
