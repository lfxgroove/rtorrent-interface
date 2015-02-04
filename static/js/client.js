"use strict";

function request(url, method, data) {
    return new lfx.Promise(function(resolve, reject) {
        var client = new XMLHttpRequest();
        client.onreadystatechange = function() {
            if (this.readyState === this.DONE) {
                console.log(this.response);
                if (parseInt(this.status / 100) === 2) {// === 200) {
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

lfx.IndexController = function() {
    this.renderer = new lfx.Renderer(this);
    return this;
};

lfx.IndexController.prototype = {
    index: function() {
        this.renderer.render("view-main");
        this._setupCallbacks();
        this._startUpdating();
    },

    //Starts updating and rerendering the progress of our torrents
    _startUpdating: function() {
        
    },
    
    _setupCallbacks: function() {
        $("#add-magnet-link").bind("click", function(event) {
            event.preventDefault();
            var magnetLink = $("#magnet-link").value;
            console.log("Ska lagga till: " + magnetLink);
        });
    }
};

var router = null;

window.onload = function() {
    router = new lfx.Router();
    router.setNotFoundRoute("notFound", new lfx.NotFoundController());
    router.addRoute("index", "index", new lfx.IndexController());
    router.go();
};
