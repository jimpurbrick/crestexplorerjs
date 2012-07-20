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
    var redirectUri = "http://jimpurbrick.github.com/crestexplorerjs/";
    var clientId = "crestexplorerjs"; // OAuth client id
    var csrfTokenName = clientId + "csrftoken";
    var hashTokenName = clientId + "hash";
    var scopes = "capsuleerRead personalContactsRead corporationContactsRead";

    // Bind click handlers to link elements.
    function bindLinks() {
        $("a").click(function(evt) {
            evt.preventDefault();
            window.location.hash = $(this).attr('href');
            return false;
        });
    }

    // True if value is an object.
    function isObject(value) {
        return value && typeof(value) === 'object';
    }

    // True if value is an array.
    function isArray(value) {
        return value && Object.prototype.toString.apply(value) === '[object Array]';
    }

    // True if value is an object containing only href and primitive properties.
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

    // Build text node from data.
    function buildElementFromPrimitive(data) {
        return String(data);
    }

    // Build link from data.
    function buildLink(data, name) {
        var link = $(document.createElement('a'))
            .attr('href', data.href)
            .addClass('name');
        if(data.name !== undefined) {
            $(link).append(data.name);
        } else if(name !== undefined && name !== "href") {
            $(link).append(name);
        } else {
            $(link).append(link[0].pathname);
        }
        return $(link);
    }

    // Build ordered list from array.
    function buildListFromArray(data) {
        var i, list = document.createElement('ol');
        for(i = 0; i < data.length; i++) {
            if(isLink(data[i])) {
                $(list).prepend(
                $(document.createElement('li'))
                    .addClass('arrayItem')
                    .append(buildLink(data[i])));
            } else {
                $(list).prepend(
                $(document.createElement('li'))
                    .addClass('arrayItem')
                    .append(buildElement(data[i])));
            }
        }
        return $(list);
    }

    // Build list item.
    function buildListItem() {
        return $(document.createElement('li')).addClass('dictionaryItem');
    }

    // Build span containing name with name class.
    function buildListName(name) {
        return $(document.createElement('span')).addClass('name').append(name);
    }

    // Build unordered list from object.
    function buildListFromObject(data) {
        var prop, item, list = document.createElement('ul');

        // Loop over object properties.
        for (prop in data) {

            // Exclude "self" links and names if used in self links.
            if (data.hasOwnProperty(prop) && prop !== "href" && (prop !== "name" || data.href === undefined)) {
                item = buildListItem();

                if (isLink(data[prop])) {

                    // Link has name, so use property name as label, otherwise use property name as link text.
                    if(data[prop].name) {
                        item.append(buildListName(prop));
                    }
                    item.append(buildLink(data[prop], prop));

                } else {

                    // Recurse over child data.
                    item.append(buildListName(prop))
                        .append($(document.createElement('span'))
                             .addClass('value')
                             .append(buildElement(data[prop])));
                }
            }
            $(list).prepend(item);
        }

        // Add "self" link to top of list.
        if(data.href) {
            $(list).prepend(buildListItem().append(buildLink(data, undefined)));
        }

        return $(list);
    }

    // Determine data type and build appropriate element.
    function buildElement(data) {
        if(isArray(data)) {
            return buildListFromArray(data);
        }
        if(isObject(data)) {
            return buildListFromObject(data);
        }
        return buildElementFromPrimitive(data);
    }

    // Show error message in main data pane.
    function displayError(error) {
        $("#data").children().replaceWith("<span>" + error + "</span>");
    }

    // Request uri and render as HTML.
    function render(uri) {
        if (uri.indexOf("http") !== 0) {
            displayError("Addresses must be absolute");
            return;
        }
        $.getJSON(uri, function(data, status, xhr) {
            $("#data").children().replaceWith(buildElement(data));
            bindLinks();
        });
    }

    // Re-request and render data.
    function refresh() {
        render(window.location.hash.substring(1));
    }

    // Toggle refresh timer.
    var intervalId = undefined;
    function onClickAutoRefresh(evt) {
        if($(evt.target).attr("checked")) {
            intervalId = setInterval(refresh, 10 * 1000);
        } else {
            clearInterval(intervalId)
        }
    }

    // Send Oauth token request on login, reset agax Authorization header on logout.
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

    // Request new URI on hash change.
    window.onhashchange = function() {
        refresh();
    };

}($, window, document)); // End crestexplorerjs