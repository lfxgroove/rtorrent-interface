"use strict";
//Our namespace
var lfx = lfx || {};

lfx.Extensions = {
    hide: function() {
        this.style.visibility = "hidden";
        this.style.display = "none";
    },

    show: function() {
        this.style.visibility = "visible";
        this.style.display = "block";
    },

    attr: function(attribute) {
        if (arguments.length == 2) {
            return this.setAttribute(arguments[0], arguments[1]);
        } else {
            return this.getAttribute(attribute);
        }
    },
    
    bind: function(type, callback) {
        this.addEventListener(type, callback);
    },

    removeChildren: function() {
        while(this.firstChild) {
            this.removeChild(this.firstChild);
        }
    },
    
    clear: function() {
        if ("innerHTML" in this) {
            this.innerHTML = "";
        }
        if ("value" in this) {
            this.value = "";
        }
    }
};

//https://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/
function extend(destination, source) {
    for (var k in source) {
        if (source.hasOwnProperty(k) && typeof(source[k]) === "function") {
            destination[k] = source[k];
        }
    }
    return destination;
}

//https://developer.mozilla.org/en-US/Add-ons/Code_snippets/QuerySelector
var $$ = function(selector, el) {
    if (!el) {
        el = document;
    }
    // return el.querySelectorAll(selector);
    // Note: the returned object is a NodeList.
    // If you'd like to convert it to a Array for convenience, use this instead:
    //Extend all elements we create by doing this.
    var arr = Array.prototype.slice.call(el.querySelectorAll(selector));
    arr.forEach(function(e) {
        extend(e, lfx.Extensions);
    });
    return arr;
    // return Array.prototype.slice.call(el.querySelectorAll(selector));
}

var $ = function(selector, el) {
    if (!el) {
        el = document;
    }
    var result = $$(selector, el);
    if (result.length == 1) {
        return result[0];
    } else {
        return result;
    }
    // return el.querySelector(selector);
}

if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, "startsWith", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(searchString, position) {
            position = position || 0;
            return this.lastIndexOf(searchString, position) === position;
        }
    });
}

lfx.Validator = function(errorContainerId) {
    this.errContainer = document.getElementById(errorContainerId);
    this.validations = [];
    this.errorMessages = [];

    this.addValidation = function(validation) {
        var obj = {
            validator: validation,
            args: []
        };
        for (var i = 1; i < arguments.length; ++i) {
            obj.args.push(arguments[i]);
        }
        this.validations.push(obj);
    };

    this.addError = function(errorStr) {
        this.errorMessages.push(errorStr);
    };

    this.showErrors = function() {
        this.errContainer.innerHTML = "";
        var me = this;
        this.errorMessages.forEach(function(str) {
            me.errContainer.innerHTML += str;
        });
        this.errorMessages = [];
    };

    var me = this;
    this.validate = function(event) {
        event.preventDefault();
        var allOk = true;
        this.validations.forEach(function(validation) {
            var elems = [];
            validation.args.forEach(function(elemName) {
                elems.push(document.getElementById(elemName).value);
            });
            var oldLength = me.errorMessages.length;
            validation.validator.apply(me, elems);
            if (oldLength != me.errorMessages.length) {
                allOk = false;
            }
        });
        if (!allOk) {
            this.showErrors();
            return false;
        } else {
            return true;
        }
    };
    return this;
}

/**
 * Helper for lfx.Promise, contains the resolve and reject functions
 * provided to the promises then() method.
 */  
lfx.PromiseEvent = function(onResolve, onReject) {
    this.resolve = onResolve;
    this.reject = onReject;
    return this;
};

/**
 * Super simple implementation of a Promise, it's not totally compliant
 * the least to say.
 * Supports chaining with .then().then() etc. You can _not_ do reject()/resolve()
 * inside a then(). You may only do reject()/resolve() once and not more than
 * once. Doing that incurs undefined behaviour but will throw an error.
 */
lfx.Promise = function(func) {
    var me = this;
    //data given to us by either resolve or reject
    this.dat = null;
    //queue of PromiseEvents, a processed event is removed.
    this.events = [];
    //Has the async event finished yet or not?
    this.eventFired = false;
    //What the last call to either resolve/reject yielded as return value.
    this.lastReturnValue = null;
    //Whether the value of lastReturnValue is valid or not
    this.hasReturnValue = false;
    //If we should call resolve or reject or undefined
    this.type = 0;
    
    func(this._resolve.bind(this), this._reject.bind(this));
    return this;
}

//Types for lfx.Promise.type
lfx.Promise.TYPE_UNDEFINED = 0;
lfx.Promise.TYPE_RESOLVE = 1;
lfx.Promise.TYPE_REJECT = 2;
lfx.Promise.prototype = {
    _reject: function(data) {
        this._doResolving(data, lfx.Promise.TYPE_REJECT);
    },

    _resolve: function(data) {
        this._doResolving(data, lfx.Promise.TYPE_RESOLVE);
    },

    _doResolving: function(data, type) {
        if (this.eventFired) {
            throw new Error("You can't reject/resolve more than once");
        }
        this.dat = data;
        this.type = type;
        this.eventFired = true;
        this.events.map(function(value/*, index, array*/) {
            this._doEventCall(type, value);
        }, this);
    },

    _doEventCall: function(type, promiseEvent) {
        var func = null;
        switch(type) {
        case lfx.Promise.TYPE_RESOLVE:
            func = promiseEvent.resolve;
            break;
        case lfx.Promise.TYPE_REJECT:
            func = promiseEvent.reject;
            break;
        default:
            throw new Error("Wrong type of PromiseEvent");
        }
        if (this.hasReturnValue) {
            this.lastReturnValue = func(this.lastReturnValue);
        } else {
            this.lastReturnValue = func(this.dat);
            this.hasReturnValue = true;
        }
    },
    
    then: function(resolv, rejec) {
        if (this.eventFired) {
            var event = new lfx.PromiseEvent(resolv, rejec);
            this._doEventCall(this.type, event);
        } else {
            this.events = this.events.concat(new lfx.PromiseEvent(resolv, rejec));
        }
        return this;
    }
};

lfx.Router = function() {
    var me = this;
    this.routes = [];
    this.notFound = {};
    this.savedUrlKey = "lastSavedUrl";

    window.addEventListener("hashchange", function(hashEvent) {
        me.handleHashChange(hashEvent);
    });

    this.setNotFoundRoute = function(name, controller) {
        this.notFound = {"name": name, "controller": controller};
    };
    
    this.addRoute = function(url, name, controller) {
        this.routes.push({
            "url": url,
            "name": name,
            "controller": controller
        });
    }

    this.splitHash = function(hash) {
        var split = hash.split("/");
        var result = [];
        split.forEach(function(str) {
            if (str != "") {
                result.push(str);
            }
        });
        return result;
    };

    /**
     * Find a matching route, order matters for matching.
     */
    this.findMatchingRoute = function(hashParts) {
        for (var i = 0; i < this.routes.length; ++i) {
            if (this.matchRoute(this.routes[i], hashParts)) {
                return this.routes[i];
            }
        }
        return null;
    };

    /**
     * Does the given route match the hashparts we have?
     */
    this.matchRoute = function(route, hashParts) {
        var routeParts = this.splitHash(route.url);
        if (routeParts.length != hashParts.length) {
            return false;
        }
        for (var i = 0; i < routeParts.length; ++i) {
            //If a part begins with this it's something we're interested
            //in later on when binding the values to names.
            if (routeParts[i][0] != ":") {
                if (routeParts[i] != hashParts[i]) {
                    return false;
                }
            }
        }
        return true;
    };

    this.extractArgsFromHash = function(route, hashParts) {
        var result = [];
        var splitUrl = this.splitHash(route.url);
        for (var i = 0; i < splitUrl.length; ++i) {
            if (splitUrl[i][0] == ":") {
                result.push(hashParts[i]);
            }
        }
        return result;
    };

    /**
     * Event handler for 'hashchange' event.
     */
    this.handleHashChange = function(hashEvent) {
        this.hashChanged(window.location.hash);
    };

    this.hashChanged = function(newHash) {
        var newUrl = this.splitHash(window.location.hash.substr(1));
        var route = this.findMatchingRoute(newUrl);
        if (route == null) {
            var notFound = this.notFound;
            notFound.controller[notFound.name].call(notFound.controller);
            return;
        }
        var args = this.extractArgsFromHash(route, newUrl);
        window.localStorage.setItem(this.savedUrlKey, window.location.hash.substr(1));
        route.controller[route.name].apply(route.controller, args);
    };
    
    /**
     * We only take the part after that hash that we want to go to, eg:
     * we want to go to http://test.se#hello/to/you. Then we supply
     * "hello/to/you" to this function.
     */
    this.changePage = function(addr) {
        window.history.pushState({}, "", window.location.pathname + "#" + addr);
        this.hashChanged(window.location.hash);
    };

    /**
     * Checks if we have any saved state which denotes the page where we want
     * to being or if there's no such state goes to the index page.
     */
    this.go = function(startPage) {
        // console.log(this.splitHash("/profile/me/"));
        // console.log(this.splitHash("/profile/me"));
        // console.log(this.splitHash("profile/me"));
        // console.log(this.splitHash("profile/me/"));
        
        var savedUrl = window.localStorage.getItem(this.savedUrlKey);
        if (savedUrl != null) {
            this.changePage(savedUrl);
        } else {
            if (startPage !== undefined) {
                this.changePage(startPage);
            } else {
                this.changePage("index");
            }
        }
    };
    
    return this;
};

/**
 * The context is used to render stuff via functions that are accessible
 * in the context object. The context is usually a controller as it is
 * right now.
 * We have 3 things, replace properties, eg: {person.name} will be replaced
 * with data from the replacements you pass to render(),
 * {render:view-some-name} will render a subview, eg another <div> which has
 * a matching id, ie. view-some-name in this case.
 * {render:somethingWhatever} will render with the help of a function, this
 * function is called on the context that you give to the renderer, the only
 * argument passed to the function called (somethingWhatever) is the parent
 * element that we can append stuff to. See ProfileController#wallPosts for
 * an example use.
 * TODO: When subviews have been rendered we need to re-render so that subviews
 * can have variables as well.
 */
lfx.Renderer = function(ctx) {
    var me = this;
    this.context = ctx;

    //Fill the cache:
    $("[data-view]").forEach(function(elem) {
        lfx.Renderer.viewCache[elem.id] = elem.cloneNode(true);
        elem.parentNode.removeChild(elem);
    });
    
    this.render = function(newPage, replacements) {
        var newView = lfx.Renderer.viewCache[newPage].cloneNode(true);
        var oldView = document.getElementById("content");
        oldView.innerHTML = this.processData(newView, replacements);
    };

    this.renderAppend = function(newPage, appendTo, replacements) {
        var newView = lfx.Renderer.viewCache[newPage].cloneNode(true);
        var oldView = document.getElementById(appendTo);
        oldView.innerHTML += this.processData(newView, replacements);
    };

    this.findRenderNodes = function(node, replacements) {
        //Replace properties in attributes as well
        //This isn't generic for the Node type, but it should
        //work as we only process elements?
        if (node.hasAttributes) {
            for (var i = 0; i < node.attributes.length; ++i) {
                var attrib = {attr: node.attributes[i].value};
                this.replacePropertyAttrib(attrib, replacements, "");
                node.attributes[i].value = attrib.attr
            }
        }
        if (node.nodeType == Node.TEXT_NODE) {
            var data = node.nodeValue.trim();
            if (data != "") {
                var renderFoundAt = data.indexOf("{render:");
                if (renderFoundAt != -1) {
                    var renderEndAt = data.indexOf("}", renderFoundAt);
                    var renderTarget = data.substr(renderFoundAt + 8,
                                                   renderEndAt - renderFoundAt - 8);
                    node.nodeValue = node.nodeValue.replace("{render:" + renderTarget + "}", "");
                    if (renderTarget.startsWith("view")) {
                        this.renderSubView(renderTarget, node.parentNode);
                    } else {
                        this.renderWithFunction(renderTarget, node.parentNode);
                    }
                }
                //We could still have the possibility to replace with something
                //that the renderer wanted, eg {name} {obj.property} etc.
                this.replaceProperty(node, replacements, "");
            }
        } else {
            for (var i = 0; i < node.childNodes.length; ++i) {
                this.findRenderNodes(node.childNodes[i], replacements);
            }
        }
    }

    this.renderSubView = function(targetName, parent) {
        var el = lfx.Renderer.viewCache[targetName].children[0].cloneNode(true);
        extend(el, lfx.Extensions);
        parent.appendChild(el);
    };
    
    /* Example of props:
     * var props = {
     *   a: "hejsan",
     *   b: "nej",
     *   c: {
     *     hi: "test",
     *     no: "yeah"
     *   }
     * };
     */
    this.replaceProperty = function(node, replacements, prepend) {
        for (var prop in replacements) {
            if (typeof replacements[prop] != "object") {
                node.nodeValue = node.nodeValue.replace("{" + prepend + prop + "}",
                                                        replacements[prop]);
            } else {
                //We need to recurse MORE!
                this.replaceProperty(node, replacements[prop], prepend + prop + ".");
            }
        }
    };

    this.replacePropertyAttrib = function(attrib, replacements, prepend) {
        for (var prop in replacements) {
            if (typeof replacements[prop] != "object") {
                attrib.attr = attrib.attr.replace("{" + prepend + prop + "}",
                                                  replacements[prop]);
            } else {
                //We need to recurse MORE!
                this.replacePropertyAttrib(attrib,
                                           replacements[prop],
                                           prepend + prop + ".");
            }
        }
    };
    
    this.renderWithFunction = function(targetName, parent) {
        parent = extend(parent, lfx.Extensions);
        this.context[targetName](parent);
    };
    
    this.processData = function(node, replacements) {
        this.findRenderNodes(node, replacements);
        return node.innerHTML;
    };
}
//The cache is to not get duplicates of the dom so that a button listener only
//goes for one specific element and not 20 copies.
//Also allows us to use the same id's in different views
lfx.Renderer.viewCache = {};

lfx.NotFoundController = function() {
    this.render = new lfx.Renderer(this);
    this.notFound = function() {
        this.render.render("view-notfound");
    };
    return this;
}
