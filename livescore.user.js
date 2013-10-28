// ==UserScript==
// @name        Livescore
// @namespace   http://ellab.org/
// @description Make livescore.com better. Show the match details in the same page instead of pop-up and show the match time in your local time
// @version     1
// @icon        http://ellab-gm.googlecode.com/svn/tags/livsecore-1/icon-128.png
// @include     http://www.livescore.com/
// @include     http://www.livescores.com/
// @include     http://www.livescore.co.uk/
// @include     http://www.livescore.com/default.dll*
// @include     http://www.livescores.com/default.dll*
// @include     http://www.livescore.co.uk/default.dll*
// @include     http://www.livescore.com/soccer/*
// @include     http://www.livescores.com/soccer/*
// @include     http://www.livescore.co.uk/soccer/*
// @require     http://ellab-gm.googlecode.com/svn/tags/livsecore-1/jquery-1.8.2.min.js
// @require     http://ellab-gm.googlecode.com/svn/tags/livsecore-1/jquery.color-2.1.0.min.js
// @resource    loading http://ellab-gm.googlecode.com/svn/tags/livsecore-1/loading.gif
// @grant       GM_getResourceURL
// ==/UserScript==

/*jshint white: false, browser: true, onevar:false, devel:true */
/*global $, chrome, GM_getResourceURL */
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
  var $sibling = $trMatch.next('tr');
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
      html = html.match(/<table bgcolor(.|\r\n)*<\/table>/m);
      if (html) {
        html = html[0];
        $td.html(html);

        // remove the nested table
        $td.find('table table').remove();
        // remove the title tr
        $td.find('.title').remove();
        // use inline style to replace class
        $td.find('.dark').removeClass('dark').css({ 'background-color': '#CCC', 'height': '16px', 'text-align': 'right' });
        $td.find('.light').removeClass('light').css({ 'background-color': '#DDD', 'height': '16px', 'text-align': 'right' });

        $td.find('table:first').attr('width', '100%');

        // use animate instead of slideDown so can start with the original height instead of collapse first
        var height = $td.height();
        $td.wrapInner('<div style="d1isplay: none; height:' + imgHeight + 'px;" />')
           .parent()
           .find('td > div')
           .animate({ 'height': height + 'px' }, { duration: 'slow' }, function() {
                       var $set = $(this);
                       $set.replaceWith($set.contents());
                     });

        // change the match row color to clearly show as separator
        $trMatch.find('td').animate({ 'backgroundColor':'#555', 'color':'#fff' }, { duration: 'slow' });
        $trMatch.find('a').animate({ 'color':'#fff' }, { duration: 'slow' });
      }
    });

    return false;
  });

  e.stopPropagation();
  e.preventDefault();
}

$('table[width="468"] tr[bgcolor="#cfcfcf"] a, table[width="468"] tr[bgcolor="#dfdfdf"] a').removeAttr('onclick').click(onClickRow);

// show local time
var hour = new Date().getHours();
var minute = new Date().getMinutes();
var minutes = hour * 60 + minute;

$('tr[bgcolor="#333333"] > td.match-light').filter(function() {
  return this.innerHTML.match(/\d\d?\:\d\d/);
}).each(function() {
  var $next = $(this).parents('tr').next('tr');

  var leagueTimeRes = this.innerHTML.match(/(\d\d?)\:(\d\d)/);
  var leagueMinutes = parseInt(leagueTimeRes[1], 10) * 60 + parseInt(leagueTimeRes[2], 10);
  var leagueOffset = Math.round((leagueMinutes - minutes) / 30) * 30;

  function replaceMatchTime(match, p1, p2) {
    var pminutes = parseInt(p1, 10) * 60 + parseInt(p2, 10) - leagueOffset;
    pminutes = pminutes % (24 * 60);
    return match + '&nbsp;(' + padTime(parseInt(pminutes / 60, 10)) + ':' + padTime(pminutes % 60) + ')';
  }

  while ($next.length > 0) {
    if ($next.attr('bgcolor') === '#cfcfcf' || $next.attr('bgcolor') === '#dfdfdf') {
      // match
      $next[0].cells[0].innerHTML = $next[0].cells[0].innerHTML.replace(/(\d\d?)\:(\d\d)/, replaceMatchTime);
    }
    else if ($next.attr('bgcolor') === '#333333') {
      // either date separator or league``   separator
      if ($next[0].cells[0].innerHTML !== '&nbsp;') {
        // === &nbsp; is date separator, !== is league separator
        break;
      }
    }

    $next = $next.next('tr');
  }
});

})();
