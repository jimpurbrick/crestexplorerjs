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

  function representationFromMediaType(mediaType) {
    return mediaType.replace('application/vnd.ccp.eve.','').replace('+json', '');
  }

  function buildRepresentationLink(schemaType, mediaType) {
    var result = $(document.createElement('a')).
    attr("class", "name").
    text(representationFromMediaType(schemaType)).
    click(function(evt) {
      evt.preventDefault();
      window.location.hash = $(this).attr('href') + '#' + schemaType;
      return false;
    });
    if (schemaType != mediaType) {
      result.attr("href", window.location.hash.substring(1).split('#')[0]);
    }
    return result;
  }

  function buildSchemaLink(mediaType, schema) {
    var dataUri, representationSchema;
    representationSchema = schema.GET[mediaType];
    dataUri = "data:application/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(representationSchema, null, 4));
    return $(document.createElement('a')).
    attr("href", dataUri).
    attr("class", "link").
    attr("download", representationFromMediaType(mediaType) + '.json').
    attr("title", "Download JSON schema").
    text("schema");
  }

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
    return value && $.type(value) === 'object';
  }

  // True if value is an array.
  function isArray(value) {
    return value && Object.prototype.toString.apply(value) === '[object Array]';
  }

  // True if value is an object containing only href and optional name string properties.
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
        if ((prop !== 'href' &&
        prop !== 'name') ||
        (! value[prop]) ||
        ($.type(value[prop]) !== 'string')) {
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
  function buildLink(data, name, description) {
    var link = $(document.createElement('a'))
    .attr('href', data.href)
    .addClass('name')
    .addClass('link');
    if(data.name !== undefined) {
      $(link).append(data.name);
    } else if(name !== undefined && name !== 'href') {
      $(link).append(name);
    } else {
      $(link).append(link[0].pathname);
    }
    if(description) {
      $(link).attr('title', description);
    }
    return $(link);
  }

  // Build ordered list from array.
  function buildListFromArray(data, schema) {
    var i, list = document.createElement('ol');

    // TODO: Validate data by checking that schema.type === 'array'

    $(list).attr('start', '0');
    for(i = 0; i < data.length; i++) {
      if(isLink(data[i])) {
        $(list).append(
          $(document.createElement('li'))
          .addClass('arrayItem')
          .append(buildLink(data[i])));
        } else {
          $(list).append(
            $(document.createElement('li'))
            .addClass('arrayItem')
            .append(buildElement(data[i], schema.items)));
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
        var span = $(document.createElement('span')).addClass('name').append(name);
        if (description) {
          span.attr('title', description);
        }
        return span;
      }

      // Build unordered list from object.
      function buildListFromObject(data, schema) {
        var prop, item, description, list = document.createElement('ul');

        // TODO: Validate data by checking that schema.type === 'object'

        // There are several patterns for representing hyperlinks in CREST currently in use:
        // 1) {name: {href: “uri”} }
        // 2) {href: {href: “uri”, name: “value”}}
        // 3) {href: “uri”, name:”value”, name2, “value2”}
        // 4) {href: “uri”, name:”value”, name2: {href:”uri2”} }

        // Loop over object properties.
        for (prop in data) {

          // Exclude "self" links and names if used in self links.
          if (data.hasOwnProperty(prop) &&
          (!prop.match(/_str$/))) { // TODO: Remove redundant *_str elements from representations.
            item = buildListItem();
            description = schema.properties[prop].description;

            if (isLink(data[prop])) {

              // Cases 1,2 and 4 have link representations which span 2 levels in the tree.
              // Handle these cases by building link from child object and adding to parent list.
              // Name property in child takes precedence over parent name to make cases
              // 1 and 2 render consistently and avoid 'href' labels.
              item.append(buildLink(data[prop], prop, description));

            } else if (prop === 'href') {

              // Cases 3 and 4 have link representations built from sibling keys..
              // Handle these cases by building a single link item from multiple keys.
              item.append(buildLink(data, data.name, description));

            } else if (prop === 'name' && data.href) {

              // Ignore name keys which will be combined with href keys to build links.
              continue;

            } else {

              // Recurse in to child data.
              item.append(buildListName(prop, description))
              .append($(document.createElement('span'))
              .addClass('value')
              .append(buildElement(data[prop], schema.properties[prop])));
            }
            $(list).append(item);
          }
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
      function render(uri, mediaType) {
        if (uri.indexOf("http") !== 0) {
          displayError("Addresses must be absolute");
          return;
        }
        $.ajax(uri, {
          method: "OPTIONS",
          dataType: "text"
        }).success(function(optionsData, optionsStatus, optionsXhr) {
          $.ajax(uri, {
            beforeSend: function(xhr) {
              if (mediaType) {
                xhr.setRequestHeader("Accept", mediaType + ", charset=utf-8");
              }
            }
          }).success(function(data, status, xhr) {
            var contentType, mediaType, schema, listElement;
            contentType = xhr.getResponseHeader("Content-Type");
            mediaType = contentType.replace("; charset=utf-8", ""); // HACK(jimp): proper parsing.
            schema = crestschema.jsonSchemaFromCrestOptions(optionsData);
            $("#representations").empty();
            for(var schemaName in schema.GET) {
              listElement = $(document.createElement('li'));
              listElement.append(buildRepresentationLink(schemaName, mediaType));
              listElement.append(buildSchemaLink(schemaName, schema));
              $("#representations").append(listElement);
            }
            $("#data").children().replaceWith(
              buildElement(data, schema.GET[mediaType]));
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
        });

        // Request new URI on hash change.
        window.onhashchange = function() {
          var fragments = window.location.hash.substring(1).split('#');
          render(fragments[0], fragments.length > 1?fragments[1]:undefined);
        };

      }($, window, document)); // End crestexplorerjs
