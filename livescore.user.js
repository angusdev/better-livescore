// ==UserScript==
// @name        Better Livescore
// @namespace   http://ellab.org/
// @description Make livescore.com better. Show the match details in the same page instead of pop-up.
// @version     3
// @icon        https://raw.github.com/angusdev/better-livescore/3/icon-128.png
// @include     http://www.livescore.com/
// @include     http://www.livescores.com/*
// @include     http://www.livescore.co.uk/*
// @include     http://www.livescore.com/soccer/*
// @require     https://raw.github.com/angusdev/better-livescore/3/jquery-1.8.2.min.js
// @require     https://raw.github.com/angusdev/better-livescore/3/jquery.color-2.1.0.min.js
// @require     https://raw.github.com/angusdev/better-livescore/3/countrycode.js
// @resource    loading.gif https://raw.github.com/angusdev/better-livescore/3/loading.gif
// @resource    flags.png https://raw.github.com/angusdev/better-livescore/3/flags.png
// @resource    flags.css https://raw.github.com/angusdev/better-livescore/3/flags.css
// @grant       GM_getResourceURL
// @grant       GM_getResourceText
// @grant       GM_addStyle
// ==/UserScript==

/*jshint white: false, browser: true, onevar:false, devel:true */
/*global $, chrome, GM_getResourceURL, org */
(function() {
'use strict';

/*jshint newcap: false */
function getResourceURL(file, resourceName) {
  if (typeof GM_getResourceURL !== 'undefined') {
    return GM_getResourceURL(resourceName || file);
  }
  else if (typeof chrome !== 'undefined' && typeof chrome.extension !== 'undefined' && typeof chrome.extension.getURL !== 'undefined') {
    return chrome.extension.getURL(file);
  }
  else {
    return file;
  }
}
/*jshint newcap: true */

var LOADING_IMG = getResourceURL('loading.gif');

function padTime(s) {
  s = '' + s;
  return  (s.length === 1)?('0' + s):s;
}

function extract(s, prefix, suffix) {
  var i;
  if (prefix) {
    i = s.indexOf(prefix);
    if (i >= 0) {
      s = s.substring(i + prefix.length);
    }
    else {
      return '';
    }
  }

  if (suffix) {
    i = s.indexOf(suffix);
    if (i >= 0) {
      s = s.substring(0, i);
    }
    else {
      return s;
    }
  }

  return s;
}

function framjax(url, checkCallback, doneCallback) {
  function loopCheckCallBack(object, doc) {
    if (checkCallback.call(iframe, doc)) {
      doneCallback.call(iframe, doc);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
      return;
    }

    window.setTimeout(function() {
      loopCheckCallBack(object, doc);
    }, 500);
  }

  var iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.onload = function() {
    if (checkCallback) {
      loopCheckCallBack(iframe, iframe.document || iframe.contentDocument || iframe.contentWindow.document);
    }
    else {
      doneCallback.call((iframe.document || iframe.contentDocument || iframe.contentWindow.document));
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  };
  document.body.append(iframe);
}

function onClickRow(e) {
  var $matchRow = $(e.target).closest('.row-gray');
  var $sibling = $matchRow.next();
  if (!$sibling.hasClass('ellab-match-details')) {
    $sibling = $('<div class="ellab-match-details"></div>').insertAfter($matchRow);
  }

  $sibling.css('background-color', '#333').html('<div style="text-align:center; padding: 5px;"><img data-role="loading" src="' + LOADING_IMG + '" border="0"/></div>');
  // keep the height for later animation
  var imgHeight = $sibling.height();

  $sibling.wrapInner('<div style="display: none;" />')
     .find('> div:first-child')
     .slideDown(200);

  var a = e.target;
  while (a.tagName.toUpperCase() != 'A') {
    a = a.parentNode;
  }

  framjax(a.href, function(doc) {
      return doc && doc.body && doc.body.innerHTML.indexOf('<div data-type="content"></div>') < 0;
    },
    function(doc) {
      var html = '';
      var tabhtml = doc.querySelector('[data-type="tab-bar"]').innerHTML;

      var tabs = doc.querySelectorAll('[data-type="tab-bar"] [data-id]');
      tabs.forEach(function(t, i) {
        var tabid = t.getAttribute('data-id');
        if (tabid) {
          doc.querySelector('[data-type="tab-bar"] [data-id="' + tabid + '"]').click();
        }
        var res = doc.body.innerHTML;
        res = doc.querySelector('[data-type=content]').innerHTML;
        if (res) {
          html += '<div content-id="' + (tabid || 'default') + '"' + (html?' style="display:none;"':'') + '>' + res + '</div>';
        }
      });

      if (html) {
        html = tabhtml + html;
        $sibling.html(html);
        $sibling.find('.row-tall').remove();
        // use animate instead of slideDown so can start with the original height instead of collapse first
        var height = $sibling.height();
        $sibling.wrapInner('<div style="overflow:hidden; height:' + imgHeight + 'px;" />')
          .find('> div:first-child')
          .animate({ 'height': height + 'px' }, 500, null, function() {
            var $set = $(this);
            $set.replaceWith($set.contents());

            // change the match row color to clearly show as separator
            $matchRow.animate({ 'backgroundColor':'#555', 'color':'#fff' }, { duration: 'slow' });
            $matchRow.find('div').animate({ 'backgroundColor':'#555', 'color':'#fff' }, { duration: 'slow' });
            $matchRow.find('a').animate({ 'color':'#fff' }, { duration: 'slow' });
          });
      }
    });

  e.stopPropagation();
  e.preventDefault();

  return false;
}

// redirect to livescore.com
if (document.location.hostname.indexOf('livescores.com') >= 0) {
  document.location.assign(document.location.href.replace('livescores.com', 'livescore.com'));
}
if (document.location.hostname.indexOf('livescore.co.uk') >= 0) {
  document.location.assign(document.location.href.replace('livescore.co.uk', 'livescore.com'));
}

// add CSS for Greasemonkey
if (typeof GM_addStyle !== 'undefined' && typeof GM_getResourceText !== 'undefined') {
  var css = GM_getResourceText('flags.css');
  GM_addStyle(css);
}

$(document).on('click', 'a[data-type="ellab-match"]', onClickRow);

// attach click events of match detail menu
$(document).on('click', '.ellab-match-details a[data-type="tab"][data-id]', function(e) {
  var $parent = $(this).parents('.ellab-match-details');
  var tid = this.getAttribute('data-id') || 'default';
  $parent.find('[data-type="tab"][data-id]').removeClass('selected');
  $(e.target).closest('a').addClass('selected');
  $parent.find('[content-id]').hide();
  $parent.find('[content-id="' + tid + '"]').show();
  e.preventDefault();
});

$(document).on('click', '.ellab-match-details .assists-link', function(e) {
  var $parent = $(this).parents('.ellab-match-details');
  $parent.find('[data-type="sub-incident"].assist').removeClass('hidden');
  e.preventDefault();
});

function main() {
  window.setTimeout(main, 1000);

  // attach click event of score
  $('a.scorelink[data-type="link"]').each(function() {
    this.parentNode.innerHTML = '<a data-type="ellab-match" href="' + this.href + '">' + this.innerHTML + '</a>';
  });

  // add flag to league
  $('.row-tall a strong[data-flag!="true"]').each(function() {
    var $this = $(this);
    if ($this.text()) {
      // trim any leading spaces
      var league = $this.text().replace(/^\s+/, '');

      var countrycode = org.ellab.livescore.getCountryCodeStartsWith(league);
      if (countrycode) {
        $this.attr('data-flag', 'true')
            .prepend('<div class="flag flag-' + countrycode +
                      '" style="background-image:url(' + getResourceURL('flags.png') + ');" />');
      }
    }
  });
}

main();

})();
