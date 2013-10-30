// ==UserScript==
// @name        Livescore
// @namespace   http://ellab.org/
// @description Make livescore.com better. Show the match details in the same page instead of pop-up and show the match time in your local time
// @version     3
// @icon        https://raw.github.com/angusdev/better-livescore/1/icon-128.png
// @include     http://www.livescore.com/
// @include     http://www.livescores.com/*
// @include     http://www.livescore.co.uk/*
// @include     http://www.livescore.com/soccer/*
// @require     https://raw.github.com/angusdev/better-livescore/1/jquery-1.8.2.min.js
// @require     https://raw.github.com/angusdev/better-livescore/1/jquery.color-2.1.0.min.js
// @resource    loading https://raw.github.com/angusdev/better-livescore/1/loading.gif
// @resource    flags https://raw.github.com/angusdev/better-livescore/3/flags.png
// @grant       GM_getResourceURL
// ==/UserScript==

/*jshint white: false, browser: true, onevar:false, devel:true */
/*global $, chrome, GM_getResourceURL, org */
(function() {
'use strict';

/*jshint newcap: false */
function getResourceURL(name, file) {
  if (typeof GM_getResourceURL !== 'undefined') {
    return GM_getResourceURL(name);
  }
  else if (typeof chrome !== 'undefined' && typeof chrome.extension !== 'undefined' && typeof chrome.extension.getURL !== 'undefined') {
    return chrome.extension.getURL(file);
  }
  else {
    return file;
  }
}
/*jshint newcap: true */

var LOADING_IMG = getResourceURL('loading', 'loading.gif');

function padTime(s) {
  s = '' + s;
  return  (s.length === 1)?('0' + s):s;
}

function onClickRow(e) {
  var $trMatch = $(e.target).closest('tr');
  var $sibling = $trMatch.next();
  if (!$sibling.hasClass('ellab-match-details')) {
    $sibling = $('<tr class="ellab-match-details"><td colspan="99" style="padding: 0;"></td></tr>').insertAfter($trMatch);
  }
  var $td = $sibling.children('td:first');

  $trMatch.find('a').each(function() {
    $td.css('background-color', '#333').html('<div style="text-align:center; padding: 5px;"><img src="' + LOADING_IMG + '" border="0"/></div>');
    // keep the height for later animation
    var imgHeight = $td.height();

    $td.wrapInner('<div style="display: none;" />')
       .parent()
       .find('td > div')
       .slideDown(500, function() {
         var $set = $(this);
         $set.replaceWith($set.contents());
        });

    $.ajax(this.href).done(function(html) {
      html = html.match(/<table(.|\r\n)*<\/table>/m);
      if (html) {
        html = html[0];
        $td.html(html);

        // remove the match result title
        $td.find('table:first-child tr:first-child').remove();

        $td.find('th.footer').closest('table').remove();

        // change the match row color to clearly show as separator
        $trMatch.find('td').animate({ 'backgroundColor':'#555', 'color':'#fff' }, { duration: 'slow' });
        $trMatch.find('a').animate({ 'color':'#fff' }, { duration: 'slow' });
      }
    });

    return false;
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

// attach click event of score
$('table.league-table a.scorelink').each(function() {
  this.parentNode.innerHTML = '<a data-type="ellab-match" href="' + this.href + '">' + this.innerHTML + '</a>';
});

$(document).on('click', 'a[data-type="ellab-match"]', onClickRow);

// attach click events of match detail menu
$(document).on('click', 'a[data-type="substitutions_button"]', function() {
  // show the substitutions table
  $(this).closest('table').siblings('table').show();
});
$(document).on('click', 'a[data-type="close_button"]', function() {
  // show the substitutions table
  $(this).closest('table').siblings('table').hide();
});
$(document).on('click', 'a[data-type="details_button"]', function() {
  // show the substitutions table
  $(this).closest('table').find('div[data-type="details"]').removeClass('hidden');
});

// add flag to league
$('.league').each(function() {
  var $this = $(this);

  if ($this.text()) {
    // trim any leading spaces
    var league = $this.text().replace(/^\s+/, '');

    var countrycode = org.ellab.livescore.getCountryCodeStartsWith(league);
    if (countrycode) {
      $this.prepend('<div class="flag flag-' + countrycode +
                    '" style="background-image:url(' + getResourceURL('flags.png', 'flags.png') + ');" />');
    }
  }
});

})();
