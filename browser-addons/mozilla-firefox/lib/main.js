//Get logging in the webconsole that firefox shows
var name = 'extensions.sdk.console.logLevel';
require('sdk/preferences/service').set(name, 'all');

var Request = require('sdk/request').Request;
var pageMod = require('sdk/page-mod');
var ss = require('sdk/simple-storage');
const {Cc, Ci} = require('chrome');

var simplePrefs = require('sdk/simple-prefs');
var prefs = simplePrefs.prefs;
var passwords = require('sdk/passwords');
var notifications = require('sdk/notifications');

var savePasswordCallback = function() {
  passwords.store({
    realm: 'User authentication',
    username: prefs['username'],
    password: prefs['password'],
    onComplete: function() {
      prefs['password'] = '';
      notifications.notify({
        title: 'Data saved',
        text: 'Password and username has been saved.'
      });
    }
  });
};

simplePrefs.on('savePassword', function(prefName) {
  passwords.search({
    onComplete: function(credentials) {
      if (credentials.length == 0) {
        savePasswordCallback();
      } else {
        passwords.remove({
          realm: 'User authentication',
          username: credentials[0].username,
          password: credentials[0].password,
          onComplete: savePasswordCallback
        });
      }
    }
  });
});

var makeServerUrl = function(path) {
  var host = prefs['host'];
  if (host.charAt(host.length - 1) != '/') {
    host += '/';
  }
  return host + path;
};

function ServerProxy() {
  this.token = null;//ss.storage.token;
  if (this.token === undefined) {
    ss.storage.token = this.token = null;
  }
  return this;
}


var netXml = require('sdk/net/xhr');

function makeRequestWithLogin(options) {
  if (options === undefined) {
    throw new Error("You need to support an options object");
  }
  return new Promise(function(resolve, reject) {
    var client = new netXml.XMLHttpRequest();
    client.onreadystatechange = function() {
      if (this.readyState === this.DONE) {
        if (parseInt(this.status / 100) === 2) {
          // options.onSuccess(JSON.parse(this.response));
          resolve(JSON.parse(this.response));
        } else {
          if (options.loginAndRetry) {
            options.loginAndRetry = false;
            passwords.search({
              onComplete: function(credentials) {
                var credential = credentials[0];
                console.log('trying to relog: ' + credential.username +
                            ' pass: ' + credential.password);
                            
                var req = serverProxy.login(credential.username,
                                            credential.password);
                req.then(function(data) {
                  console.log('Done with login request: ');
                  console.log(data);
                  // console.log(options);
                  options.headers = {
                    'Authorization': 'Bearer ' + serverProxy.token
                  };
                  makeRequest(options).then(function(data) {
                    console.log('done with retried request');
                    resolve(data);
                  }, function(err) {
                    console.log('errored with retried request');
                    reject(err);
                  });
                }, function(err) {
                  console.log('Error while trying to relog');
                  console.log(err);
                });
              }
            });
          } else {
            reject(this.response);
          }
          // options.onError(this.response);
          // reject(this.response);
        }
      }
    };

    if (!options.url) {
      throw new Error('You need to supply an url you want to get');
    }
    
    var method = options.method || 'GET';
    client.open(method, options.url, true);
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

function makeRequest(options) {
  if (options === undefined) {
    throw new Error("You need to support an options object");
  }
  return new Promise(function(resolve, reject) {
    var client = new netXml.XMLHttpRequest();
    client.onreadystatechange = function() {
      if (this.readyState === this.DONE) {
        if (parseInt(this.status / 100) === 2) {
          // options.onSuccess(JSON.parse(this.response));
          resolve(JSON.parse(this.response));
        } else {
          // options.onError(this.response);
          reject(this.response);
        }
      }
    };

    if (!options.url) {
      throw new Error('You need to supply an url you want to get');
    }
    
    var method = options.method || 'GET';
    client.open(method, options.url, true);
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
    // ss.storage.token = token;
    // this.token = null;
    // ss.storage.token = null;
  },
  
  login: function(username, password) {
    var me = this;
    var req = makeRequest({
      url: makeServerUrl('auth'),
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
    var req = makeRequestWithLogin({
      url: makeServerUrl('add_magnet/'),
      loginAndRetry: true,
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
  passwords.search({
    onComplete: function(credentials) {
      if (credentials.length == 0) {
        notifications.notify({
          title: 'Error',
          text: 'You need to setup a username and password ' +
            'before using this addon, go to the add-on manager ' +
            'and press settings for ' + require('sdk/self').name
        });
        return;
      }
      var credential = credentials[0];
      var req = serverProxy.login(credential.username, credential.password);
      req.then(function(data) {
        console.log('Gick bra');
        console.log(data);
      }, function(err) {
        console.log('ERRORORORR:');
        console.log(err);
      });
    }
  });
}
