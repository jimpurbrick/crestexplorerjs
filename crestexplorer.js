/*!
 * crestexplorerjs
 * https://github.com/somerepo/
 *
 * Copyright 2012, CCP (http://www.ccpgames.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */

/*
 * An example read-only JavaScript CREST API explorer application which relies only on API conventions
 * for link structure and so uses generic "application/json" Accept and Content-Type headers. Applications written
 * in this way should never rely on the structure of specific representations as they made change.
 */

/*jslint undef: true, browser: true, vars: true, white: true, forin: true, plusplus: true, bitwise: true, eqeq: true, maxerr: 50, indent: 4 */
/*global $ */

(function ($, window, document) { // Start crestexplorerjs

    "use strict";

    // Configuration parameters
    var redirectUri = "http://10.1.4.51:8888/index.html";
    var clientId = "localcrestexplorerjs"; // OAuth client id
    var csrfTokenName = clientId + "csrftoken";
    var hashTokenName = clientId + "hash";
    var scopes = "capsuleerRead personalContactsRead corporationContactsRead";
    
    function bind() {
        $("a").click(function(evt) {
            evt.preventDefault();
            window.location.hash = $(this).attr('href');
            return false;
        });
    }
    
    function isObject(value) {
        return typeof(value) === 'object';
    }

    function isArray(value) {
        return Object.prototype.toString.apply(value) === '[object Array]';
    }

    function isLink(value) {
        var prop;
        if (! isObject(value)) {
            return false;
        }
        if (value.href === undefined) {
            return false;
        }
        for (prop in value) {
            if (value.hasOwnProperty(prop)) {
                if (isArray(value[prop])) {
                    return false;
                }
                if (isObject(value[prop])) {
                    return false;
                }
            }
        }
        return true;
    }

    function buildElementFromPrimitive(data) {
        return String(data);
    }
    
    function buildElementFromLink(data, name) {
        var link = $(document.createElement('a'))
            .attr('href', data.href)
            .addClass('name');
        if(data.name !== undefined) {
            $(link).append(data.name);
        } else if(name !== undefined) {
            $(link).append(name);
        } else {
            $(link).append(data.href);
        }
        return $(link);
    }

    function buildElementFromArray(data) {
        var i, list = document.createElement('ul');
        for(i = 0; i < data.length; i++) {
            if(isLink(data[i])) {
                $(list).prepend(
                $(document.createElement('li'))
                    .addClass('arrayItem')
                    .append(buildElementFromLink(data[i])));
            } else {
                $(list).prepend(
                $(document.createElement('li'))
                    .addClass('arrayItem')
                    .append(buildElement(data[i])));
            }
        }
        return $(list);
    }

    function buildElementFromObject(data) {
        var prop, list = document.createElement('ul');

        if (data.href !== undefined) {
            $(list).prepend(
                $(document.createElement('li'))
                    .addClass('dictionaryItem')
                    .append(buildElementFromLink(data, data.name)));
        }
        for (prop in data) {
            if (data.hasOwnProperty(prop)) {
                $(list).prepend(
                    $(document.createElement('li'))
                        .addClass('dictionaryItem')
                    .append($(document.createElement('span'))
                        .addClass('name')
                        .append(prop))
                    .append($(document.createElement('span'))
                        .addClass('value')
                        .append(buildElement(data[prop]))));
            }
        }
        return $(list);
    }

    function buildElement(data) {
        if(isArray(data)) {
            return buildElementFromArray(data);
        }
        if(isObject(data)) {
            return buildElementFromObject(data);
        }
        return buildElementFromPrimitive(data);
    }

    function displayError(error) {
        $("#data").children().replaceWith("<span>" + error + "</span>");
    }

    function render(uri) {
        if (uri.indexOf("http") !== 0) {
            displayError("Addresses must be absolute");
            return;
        }
        $.getJSON(uri, function(data, status, xhr) {
            $("#data").children().replaceWith(buildElement(data));
            bind();
        });
    }

    function refresh() {
        render(window.location.hash.substring(1));
    }

    var intervalId = undefined;
    function onClickAutoRefresh(evt) {
        if($(evt.target).attr("checked")) {
            intervalId = setInterval(refresh, 10 * 1000);
        } else {
            clearInterval(intervalId)
        }
    }

    function onClickLogin(evt) {
        var command = $("#login").text();
        if (command === "login") {

            // Store CSRF token and current location as cookie
            var csrfToken = uuidGen();
            $.cookie(csrfTokenName, csrfToken);
            $.cookie(hashTokenName, window.location.hash);

            // No OAuth token, request one from the OAuth authentication endpoint
            window.location =  "http://login.jim01.dev/oauth/Authorize/" +
                "?response_type=token" +
                "&client_id=" + clientId +
                "&scope=" + scopes +
                "&redirect_uri=" + redirectUri +
                "&state=" + csrfToken;

        } else {
            ajaxSetup(false);
            loginSetup(false);
        }
        evt.preventDefault();
    }

    // Extract value from oauth formatted hash fragment.
    function extractFromHash(name, hash) {
        var match = hash.match(new RegExp(name + "=([^&]+)"));
        return !!match && match[1];
    }

    // Generate an RFC4122 version 4 UUID
    function uuidGen() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    function ajaxSetup(token) {
        var headers = {
            "Accept": "application/json, charset=utf-8"
        };
        if (token) {
            headers.Authorization = "Bearer " + token;
        }
        $.ajaxSetup({
            accepts: "application/json, charset=utf-8",
            crossDomain: true,
            type: "GET",
            dataType: "json",
            headers: headers,
            error: function (xhr, status, error) {
                displayError(error);
            }
        });
    }

    function loginSetup(token) {
        $("#login").text(token? "logout":"login").click(onClickLogin);
    }

    $(document).ready(function() {

        var hash = window.location.hash;
        var token = extractFromHash("access_token", hash);

        if (token) {

            // Check CSRF token in state matches token saved in cookie
            if(extractFromHash("state", hash) !== $.cookie(csrfTokenName)) {
                displayError("CSRF token mismatch");
                return;
            }

            // Restore hash.
            window.location.hash = $.cookie(hashTokenName);

            // Delete cookies.
            $.cookie(csrfTokenName, null);
            $.cookie(hashTokenName, null);
        }

        ajaxSetup(token);
        loginSetup(token);

        $("#autorefresh > input").click(onClickAutoRefresh);
        refresh();
    });

    window.onhashchange = function() {
        refresh();
    };

}($, window, document)); // End crestexplorerjs