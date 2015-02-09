"use strict";

/**
 * The options is a object which can contain the following keys:
 * * method - which HTTP method verb to use
 * * data - an object which will be converted to json before sending
 * * headers - an object which contains the name of the headers
 * * type - How you would like to send your data, can be 'form' or 'json'
 *          they will both add headers which you may overwrite with the headers
 *          option. Defaults to json
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
            if (!options.type || options.type == "json") {
                data = JSON.stringify(options.data);
            } else if(options.type == "post") {
                data = new FormData();
                for (var key in options.data) {
                    data.append(key, options.data[key]);
                }
            } else {
                throw new Error("Unsupported type option for makeRequest");
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
            $("#login-errors").innerHTML = "Your token has expired and you " +
                "to login again";
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
        var req = makeRequest("get_torrents/", {
            headers: {
                "Authorization": "Bearer " + this.token
            }
        });
        req.then(function(data) { return data; },
                 this._handleExpiredToken.bind(this));
        return req;
    },

    addMagnet: function(magnetLink) {
        var req = makeRequest("add_magnet/", {
            headers: {
                "Authorization": "Bearer " + this.token
            },
            method: "POST",
            type: "post",
            data: {
                "link": magnetLink
            }
        });
        req.then(function(data) { return data; },
                 this._handleExpiredToken.bind(this));
        return req;
    },
    
    logIn: function(username, password) {
        var me = this;
        var req = makeRequest("auth", {
            method: "POST",
            type: "json",
            data: {
                "username": username,
                "password": password
            },
        });
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
    /**
     * Whether or not we should keep updating status etc via AJAX.
     */
    this.updatesEnabled = false;
    this.torrentUpdateTimer = null;
    this.TORRENT_UPDATE_INTERVAL = 10000;
    this.upUpdateTimer = null;
    this.TORRENT_UP_INTERVAL = 5000;
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
        this._enableUpdates();
        this._setupCallbacks();
        this._startCheckingIfUp();
    },

    //Called when we navigate away from index
    indexNavFrom: function() {
        this._disableUpdates();
        console.log("Navigating away!");
    },

    _enableUpdates: function() {
        this.updatesEnabled = true;
    },

    _disableUpdates: function() {
        this.updatesEnabled = false;
    },
    
    _startCheckingIfUp: function() {
        clearTimeout(this.upUpdateTimer);
        if (this.updatesEnabled) {
            setTimeout(this._isUp.bind(this),
                       this.TORRENT_UP_INTERVAL);
        }
    },

    _isUp: function() {
        var me = this;
        var req = serverProxy.isAvailable();
        req.then(function(data) {
            if (!me.updatesEnabled) {
                return;
            }
            me.isUp = true;
            $("#rtorrent-status").innerHTML = "Up";
            me._startUpdating();
        }, function(error) {
            if (!me.updatesEnabled) {
                return;
            }
            me.isUp = false;
            $("#rtorrent-status").innerHTML = "Down";
            me._startCheckingIfUp();
        });
    },
    
    //Starts updating and rerendering the progress of our torrents
    _startUpdating: function() {
        clearTimeout(this.torrentUpdateTimer);
        if (this.updatesEnabled) {
            setTimeout(this._updateTorrents.bind(this),
                       this.TORRENT_UPDATE_INTERVAL);
        }
    },

    //Does the actual update of which torrents have come how far.
    _updateTorrents: function() {
        var me = this;
        var req = serverProxy.getTorrents();
        req.then(function(data) {
            if (!me.updatesEnabled) {
                return;
            }
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
            var req = serverProxy.addMagnet(magnetLink);
            req.then(function(data) {
                $("#add-errors").addClass("hidden");
                console.log(data);
                console.log("All went fine");
            }, function(error) {
                $("#add-errors").removeClass("hidden");
                $("#add-errors").innerHTML = error.message;
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
