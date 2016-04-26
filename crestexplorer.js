/*!
 * crestexplorerjs
 * https://github.com/jimpurbrick/crestexplorerjs
 *
 * Copyright 2012, CCP (http://www.ccpgames.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */

/*
 * An example read-only JavaScript CREST API explorer application which relies only on API conventions
 * for link structure and so uses generic "application/json" Accept and Content-Type headers. Applications written
 * in this way should never rely on the structure of specific representations as they may change.
 */

/*jslint undef: true, browser: true, vars: true, white: true, forin: true, plusplus: true, bitwise: true, eqeq: true, maxerr: 50, indent: 4 */
/*global $ */

(function ($, window, document) { // Start crestexplorerjs

    "use strict";

    // Configuration parameters
    var redirectUri = "http://jimpurbrick.com/crestexplorerjs/";
    var authorizationEndpoint = "https://login.eveonline.com/oauth/authorize/"; // TODO(jimp): determine auth endpoint based on initial URI.
    var clientId = "c8cc66f9e3a9488993f553264fc5f428"; // OAuth client id
    var csrfTokenName = clientId + "csrftoken";
    var hashTokenName = clientId + "hash";
    var scopes = "publicData characterLocationRead characterFittingsRead characterContactsRead";

    // Bind click handlers to link elements.
    function bindLinks() {
        $(".link").click(function(evt) {
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
            .addClass('name')
            .addClass('link');
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
    function buildListFromArray(data, schema) {
        var i, list = document.createElement('ol');
	$(list).attr('start', '0');
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
		.append(buildElement(data[i], schema)));
            }
        }
        return $(list);
    }

    // Build list item.
    function buildListItem() {
        return $(document.createElement('li')).addClass('dictionaryItem');
    }

    // Build span containing name with name class.
    function buildListName(name, description) {
        span = $(document.createElement('span')).addClass('name').append(name);
	if (description) {
	    span.attr('title', description);
	}
	return span;
    }

    // Build unordered list from object.
    function buildListFromObject(data, schema) {
        var prop, item, list = document.createElement('ul');

	// TODO: Validate data by checking that schema.type === 'object'

        // Loop over object properties.
        for (prop in data) {

            // Exclude "self" links and names if used in self links.
            if (data.hasOwnProperty(prop) &&
		prop !== "href" &&
		(prop !== "name" || data.href === undefined) &&
		(!prop.match(/_str$/))) { // TODO: Remove redundant *_str elements from representations.
                item = buildListItem();

                if (isLink(data[prop])) {

                    // Link has name, so use property name as label, otherwise use property name as link text.
                    if(data[prop].name) {
                        item.append(buildListName(prop));
                    }
                    item.append(buildLink(data[prop], prop));

                } else {

                    // Recurse over child data.
                    item.append(buildListName(prop, schema.properties[prop].description))
                        .append($(document.createElement('span'))
                             .addClass('value')
				.append(buildElement(data[prop], schema.properties[prop])));
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
    function buildElement(data, schema) {
        if(isArray(data)) {
            return buildListFromArray(data, schema);
        }
        if(isObject(data)) {
            return buildListFromObject(data, schema);
        }
        return buildElementFromPrimitive(data, schema);
    }

    // Show error message in main data pane.
    function displayError(error) {
	$("#content").hide();
	$("#error").text(error).show();
    }

    // Request uri and render as HTML.
    function render(uri) {
        if (uri.indexOf("http") !== 0) {
            displayError("Addresses must be absolute");
            return;
        }
	$.ajax(uri, {
		"method": "OPTIONS",
		"dataType": "text"
	}).success(function(optionsData, optionsStatus, optionsXhr) {
		$.getJSON(uri, function(data, status, xhr) {
			var contentType, representationName, schema, dataUri, fileName, representationSchema;			
			contentType = xhr.getResponseHeader("Content-Type");
			representationName = contentType.replace("; charset=utf-8", ""); // HACK(jimp): proper parsing.
			$("#representationName").text(representationName);
			schema = crestschema.jsonSchemaFromCrestOptions(optionsData);
			representationSchema = schema.GET[representationName];
			$("#data").children().replaceWith(buildElement(data, representationSchema));
			dataUri = "data:application/json;charset=utf-8," +
			    encodeURIComponent(JSON.stringify(representationSchema, null, 4));
			fileName = representationName.
			    replace('application/vnd.ccp.eve.','').
			    replace('+', '.');
			$("#schema").attr("href", dataUri).attr("download", fileName);
			bindLinks();
			$("#error").hide();
			$("#content").show();
		});
	});
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

        } else {

	    // Store CSRF token and current hash as cookie
	    var csrfToken = uuidGen();
            $.cookie(csrfTokenName, csrfToken);
	    $.cookie(hashTokenName, window.location.hash);

            // No OAuth token, request one from the OAuth authentication endpoint
            window.location = authorizationEndpoint +
                "?response_type=token" +
                "&client_id=" + clientId +
                "&scope=" + scopes +
                "&redirect_uri=" + redirectUri +
                "&state=" + csrfToken;
	}

        ajaxSetup(token);
	render(window.location.hash.substring(1));
    });

    // Request new URI on hash change.
    window.onhashchange = function() {
	render(window.location.hash.substring(1));
    };

}($, window, document)); // End crestexplorerjs