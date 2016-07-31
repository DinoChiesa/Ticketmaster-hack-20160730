// ng-ticketmaster-formatters.js
// ------------------------------------------------------------------
//
// format filters for ticketmaster entities.
//
// last saved: <2016-July-31 07:17:41>


;(function (){
  'use strict';
  var re = new RegExp('^[A-Z][a-z]+, [A-Z]{2}$');
  function seemsLikeCityState(s) {
    return re.test(s);
  }
  function getAddressForVenue(v) {
    var addr = v.address.line1 || '';
    if (v.address.line2 && !seemsLikeCityState(v.address.line2)) {
      if (addr) {
        addr += '&nbsp;//&nbsp;';
      }
      addr += v.address.line2;
    }
    if (addr) { addr += ', '; }
    addr += v.city.name + ' ';
    if (v.state && v.state.name) { addr += v.state.name + '  ';}
    if (v.postalCode) { addr += v.postalCode;}
    return addr;
  }

  angular
    .module('tmApp1')
    .filter('eventHyperlinked', ['$sce', function($sce) {
      return function(event) {
        // event.id = tm event id
        // event.url = external link
        return $sce.trustAsHtml('<a href="' + event.url + '">' + event.name + '</a>');
      };
    }])
    .filter('venueHyperlinked', ['$sce', function($sce) {
      return function(venue) {
        var address = getAddressForVenue(venue);
        return $sce.trustAsHtml('<div class="venue-name">' + venue.name + '</div>' +
                                '<div class="venue-address"><a href="http://maps.google.com/?q=' + address + '">' + address + '</a></div>');
      };
    }])
  ;

}(this));
