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

(function () { // Start crestexplorerjs

    "use strict";

    // force cross-site scripting (needed for IE9 CORS support with jQuery 1.5)
    jQuery.support.cors = true;
    
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
        return isObject(value) && (value.href !== undefined);
    }

    function buildElementFromPrimitive(data) {
        return String(data);
    }
    
    function buildElementFromLink(data, name) {
        var link = $(document.createElement('a'))
            .attr('href', data.href)
            .addClass('name');
        if(name !== undefined) {
            $(link).append(name);
        } else if(data.name != undefined) {
            $(link).append(data.name);
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
        for (prop in data) {
        if (data.hasOwnProperty(prop) ) {
            if (isLink(data[prop])) {
                $(list).prepend(
                    $(document.createElement('li'))
                        .addClass('dictionaryItem')
                    .append(buildElementFromLink(data[prop], prop)));
                } else {
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

    function render(path) {
        $.getJSON(path, function(data, status, xhr) {
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

    $(document).ready(function() {
        $.ajaxSetup({
            accepts: "application/json, charset=utf-8",
            crossDomain: true,
            type: "GET",
            dataType: "json",
            headers: {
                "Accept": "application/json, charset=utf-8"
            },
            error: function (xhr, status, error) {
                $("#data").children().replaceWith("<span>Error: " + error + "</span>");
            }
        });
        $("#autorefresh > input").click(onClickAutoRefresh);
        refresh();
    });

    window.onhashchange = function() {
        refresh();
    };

}()); // End crestexplorerjs