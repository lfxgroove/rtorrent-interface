"use strict";

function requestJson(url, method, data) {
    return new lfx.Promise(function(resolve, reject) {
        var client = new XMLHttpRequest();
        client.onreadystatechange = function() {
            if (this.readyState === this.DONE) {
                //console.log(this.response);
                if (parseInt(this.status / 100) === 2) {
                    resolve(JSON.parse(this.response));
                } else {
                    reject(JSON.parse(this.response));
                }
            }
        };
        client.onerror = function() {
            console.log("GOT ERROR");
        };
        client.open(method, url, true);
        // client.responseType = "json";
        // client.setRequestHeader("Accept", "application/json");
        client.setRequestHeader("Content-Type", "application/json");
        //Turn the data into a FormData thing instead:
        if (data != undefined) {
            client.send(JSON.stringify(data));
        } else {
            client.send();
        }
    });
}

/**
 * The options is a object which can contain the following keys:
 * * method - which HTTP method verb to use
 * * data - an object which will be converted to json before sending
 * * headers - an object which contains the name of the headers
 * you would like to send and their values. Eg:
 * <code>
 * makeRequest('get_data', {
 *     method: 'POST',
 *     data: {'data1': 'some data', 'another json value': 'val'},
 *     headers: {'Content-Type': 'application/json',
 *               'Authorization': 'None'}
 * });
 * </code>
 * This would make a request to get_data as POST, send along the
 * json representation of `data` and add the given headers along
 * with their values.
 */  
function makeRequest(url, options) {
    if (options === undefined) {
        options = {};
    }
    return new lfx.Promise(function(resolve, reject) {
        var client = new XMLHttpRequest();
        client.onreadystatechange = function() {
            if (this.readyState === this.DONE) {
                if (parseInt(this.status / 100) === 2) {
                    resolve(JSON.parse(this.response));
                } else {
                    reject(JSON.parse(this.response));
                }
            }
        };

        var method = options.method || "GET";
        client.open(method, url, true);
        var data = null;
        if (options.data) {
            data = JSON.stringify(data);
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

function request(url, method, data) {
    return new lfx.Promise(function(resolve, reject) {
        var client = new XMLHttpRequest();
        client.onreadystatechange = function() {
            if (this.readyState === this.DONE) {
                //console.log(this.response);
                if (parseInt(this.status / 100) === 2) {
                    resolve(JSON.parse(this.response));
                } else {
                    reject(JSON.parse(this.response));
                }
            }
        };
        client.onerror = function() {
            console.log("GOT ERROR");
        };
        client.open(method, url, true);
        // client.responseType = "json";
        // client.setRequestHeader("Accept", "application/json");
        //Turn the data into a FormData thing instead:
        if (data != undefined) {
            var formData = new FormData();
            for (var key in data) {
                formData.append(key, data[key]);
            }
            client.send(formData);
        } else {
            client.send();
        }
    });
}

lfx.ServerProxy = function() {
    this.storageTokenName = "lfxRTorrentToken";
    this.token = null;
    var tmp = localStorage.getItem(this.storageTokenName);
    if (tmp !== null && tmp !== undefined) {
        this.token = tmp;
    }
    return this;
};

lfx.ServerProxy.prototype = {
    _handleExpiredToken: function(error) {
        if (error.description == "Token is expired") {
            this._setToken(null);
            console.log("Your token has expired and you need to login again");
            router.changePage("login");
        }
        return error;
    },

    _setToken: function(newToken) {
        this.token = newToken;
        localStorage.setItem(this.storageTokenName, newToken);
    },
    
    isLoggedIn: function() {
        return this.token != null;
    },

    isAvailable: function() {
        var req = makeRequest("is_available/", {
            headers: {
                "Authorization": "Bearer " + this.token
            }
        });
        req.then(function(data) { return data; },
                 this._handleExpiredToken.bind(this));
        return req;
    },

    getTorrents: function() {
        
    },

    addMagnet: function() {
        
    },
    
    logIn: function(username, password) {
        var me = this;
        var req = requestJson("auth", "POST",
                          {username: username,
                           password: password});
        req.then(function(data) {
            return data;
        }, this._handleExpiredToken.bind(this));
        req.then(function(data) {
            localStorage.setItem(me.storageTokenName, data.token);
            return data;
        }, function(error) {
            return error;
        });
        return req;
    }
};

lfx.LoginController = function() {
    this.renderer = new lfx.Renderer(this);
    return this;
};

lfx.LoginController.prototype = {
    login: function() {
        this.renderer.render("view-login");
        this._setupCallbacks();
    },

    loginNavFrom: function() {
        console.log("Navigating away from login");
    },

    _setupCallbacks: function() {
        $("#login").bind("click", function(event) {
            event.preventDefault();
            var req = serverProxy.logIn($("#username").value,
                                        $("#password").value);
            req.then(function(data) {
                router.changePage("index");
            }, function(error) {
                $("#login-errors").innerHTML =
                    "<b>Error when logging in:</b> " + error.description;
                $("#login-errors").removeClass("hidden");
            });
        });
    }
};

lfx.IndexController = function() {
    this.renderer = new lfx.Renderer(this);
    this.torrentUpdateTimer = null;
    this.TORRENT_UPDATE_INTERVAL = 1000;
    this.upUpdateTimer = null;
    this.TORRENT_UP_INTERVAL = 500;
    this.isUp = false;
    return this;
};

lfx.IndexController.prototype = {
    index: function() {
        if (!serverProxy.isLoggedIn()) {
            router.changePage("login");
            return;
        }
        this.renderer.render("view-main");
        this._setupCallbacks();
        this._startCheckingIfUp();
    },

    //Called when we navigate away from index
    indexNavFrom: function() {
        console.log("Navigating away!");
    },

    _startCheckingIfUp: function() {
        clearTimeout(this.upUpdateTimer);
        // setTimeout(this._isUp.bind(this), this.TORRENT_UP_INTERVAL);
    },

    _isUp: function() {
        var me = this;
        // var req = request("is_available/", "GET")
        var req = serverProxy.isAvailable();
        req.then(function(data) {
            me.isUp = true;
            $("#rtorrent-status").innerHTML = "Up";
            me._startUpdating();
        }, function(error) {
            me.isUp = false;
            $("#rtorrent-status").innerHTML = "Down";
            me._startCheckingIfUp();
        });
    },
    
    //Starts updating and rerendering the progress of our torrents
    _startUpdating: function() {
        clearTimeout(this.torrentUpdateTimer);
        // setTimeout(this._updateTorrents.bind(this),
        //            this.TORRENT_UPDATE_INTERVAL);
    },

    _updateTorrents: function() {
        var me = this;
        var req = request('get_torrents/', 'GET');
        req.then(function(data) {
            $("#torrent-container").removeChildren();
            var torrents = data.data;
            torrents.forEach(function(torrent) {
                me.renderer.renderAppend("view-torrent-info",
                                         "torrent-container",
                                         {torrent: torrent});
            });
            me._startUpdating();
        }, function(error) {
            me._startCheckingIfUp();
        });
    },
    
    _setupCallbacks: function() {
        $("#add-magnet-link").bind("click", function(event) {
            event.preventDefault();
            var magnetLink = $("#magnet-link").value;
            var req = request('add_magnet/', 'POST', {link: magnetLink});
            req.then(function(data) {
                console.log("All went fine");
            }, function(error) {
                console.log("ERROR WHEN ADDING LINK");
                console.log(error);
            });
        });
    }
};

var router = null;
var serverProxy = null;

window.onload = function() {
    serverProxy = new lfx.ServerProxy();
    
    router = new lfx.Router();
    router.setNotFoundRoute("notFound", new lfx.NotFoundController());
    router.addRoute("index", "index", new lfx.IndexController());
    router.addRoute("login", "login", new lfx.LoginController());
    router.go("login");
};
