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
    return this;
};

lfx.ServerProxy.prototype = {
    isLoggedIn: function() {
        return false;
    },

    isAvailable: function() {
        
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
            localStorage.setItem(me.storageTokenName, data.token);
            console.log(data);
            return data;
        }, function(error) {
            console.log(error);
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

    _setupCallbacks: function() {
        $("#login").bind("click", function(event) {
            event.preventDefault();
            var req = serverProxy.logIn($("#username").value,
                                        $("#password").value);
            req.then(function(data) {
                console.log("Logged in and got response: ");
                console.log(data);
            }, function(error) {
                $("#login-errors").innerHTML = "Error when logging in";
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

    _startCheckingIfUp: function() {
        clearTimeout(this.upUpdateTimer);
        // setTimeout(this._isUp.bind(this), this.TORRENT_UP_INTERVAL);
    },

    _isUp: function() {
        var me = this;
        var req = request("is_available/", "GET")
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
