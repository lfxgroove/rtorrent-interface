//Get logging in the webconsole that firefox shows
var name = 'extensions.sdk.console.logLevel';
require('sdk/preferences/service').set(name, 'all');

var Request = require('sdk/request').Request;
var pageMod = require('sdk/page-mod');
var ss = require('sdk/simple-storage');
const {Cc, Ci} = require('chrome');

var simplePrefs = require('sdk/simple-prefs');

simplePrefs.on('savePassword', function(prefName) {
  //This is horrible
  // require('sdk/passwords').search({
  //   onComplete: function onComplete(credentials) {
  //     console.log(credentials);
  //     if (credentials.length == 0) {
  //       console.log('No credentials, need to save them');
  //       require('sdk/passwords').store({
  //         realm: 'User authentication',
  //         username: simplePrefs.prefs['username'],
  //         password: simplePrefs.prefs['password'],
  //         onComplete: function(credential) {
  //           console.log('Changed as well');
  //           simplePrefs.prefs['password'] = '';
  //         }
  //       });
  //     } else {
  //       credentials.forEach(function(credential) {
  //         require('sdk/passwords').remove({
  //           username: credential.username,
  //           onComplete: function(credential) {
  //             require('sdk/passwords').store({
  //               realm: 'User authentication',
  //               username: simplePrefs.prefs['username'],
  //               password: simplePrefs.prefs['password'],
  //               onComplete: function(credential) {
  //                 console.log('It changed!');
  //                 console.log(simplePrefs.prefs['password']);
  //                 simplePrefs.prefs['password'] = '';
  //               }
  //             });
  //           }
  //         });
  //       });
  //     }
  //   }
  // });
});

function ServerProxy() {
  this.token = ss.storage.token;
  if (this.token === undefined) {
    ss.storage.token = this.token = null;
  }
  return this;
}

var netXml = require('sdk/net/xhr');
function makeRequest(url, options) {
  if (options === undefined) {
    options = {};
  }
  return new Promise(function(resolve, reject) {
    var client = new netXml.XMLHttpRequest();
    client.onreadystatechange = function() {
      if (this.readyState === this.DONE) {
        if (parseInt(this.status / 100) === 2) {
          resolve(JSON.parse(this.response));
        } else {
          reject(this.response);
        }
      }
    };

    var method = options.method || 'GET';
    client.open(method, url, true);
    var data = null;
    if (options.data) {
      if (!options.type || options.type == 'json') {
        data = JSON.stringify(options.data);
      } else if(options.type == 'post') {
        //equivalent to new FormData()
        data = Cc['@mozilla.org/files/formdata;1']
          .createInstance(Ci.nsIDOMFormData);
        for (var key in options.data) {
          data.append(key, options.data[key]);
        }
      } else {
        throw new Error('Unsupported type option for makeRequest');
      }
    }
    if (options.headers) {
      Object.keys(options.headers).forEach(function(value) {
        client.setRequestHeader(value, options.headers[value]);
      });
    }
    if (data != null) {
      client.send(data);
    } else {
      client.send();
    }
  });
}

ServerProxy.prototype = {
  _setToken: function(token) {
    this.token = token;
    ss.storage.token = token;
  },
  
  login: function(username, password) {
    var me = this;
    var req = makeRequest('http://localhost:5000/auth', {
      method: 'POST',
      type: 'json',
      data: {
        'username': username,
        'password': password
      },
    });
    req.then(function(data) {
      me._setToken(data.token);
      return data;
    }, function(error) {
      return error;
    });
    return req;
  },
  
  addMagnet: function(magnetLink) {
    var req = makeRequest('http://localhost:5000/add_magnet/', {
      headers: {
        'Authorization': 'Bearer ' + this.token
      },
      method: 'POST',
      type: 'post',
      data: {
        'link': magnetLink
      }
    });
    return req;
  },

  isLoggedIn: function() {
    return this.token != null;
  }
};

var serverProxy = new ServerProxy();

pageMod.PageMod({
  include: '*.kickass.to',
  contentScriptFile: './kickass-handler.js',
  onAttach: function(worker) {
    worker.port.on('addMagnet', function(link) {
      console.log('I want to add link:' + link);
      serverProxy.addMagnet(link).then(function(data) {
        console.log('sucecss!:');
        console.log(data);
        worker.port.emit('magnetAdded');
      }, function(err) {
        console.log('Error');
        console.log(err);
      });
    });
  }
});

var buttons = require('sdk/ui/button/action');
var tabs = require('sdk/tabs');

var button = buttons.ActionButton({
  id: 'mozilla-link',
  label: 'Visit Mozilla',
  icon: {
    '16': './icon-16.png',
    '32': './icon-32.png',
    '64': './icon-64.png'
  },
  onClick: handleClick
});

function handleClick(state) {
  var req = serverProxy.login('arne', 'arne');
  req.then(function(data) {
    console.log('Gick bra');
    console.log(data);
  }, function(err) {
    console.log('ERRORORORR:');
    console.log(err);
  });
}
