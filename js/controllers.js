/*global log: false, angular: false, window: false */
'use strict';

// a unique id for local Storage
var html5AppId = 'EFF0F726-370B-4A87-BFFA-81BFB1B0DD14';
var DISPLAY_ITEMS_PER_PAGE = 10;
var ITEMS_PER_REQUEST = 100;
var baseUrl = 'https://app.ticketmaster.com';
var eventsUrl = joinUrlElements( baseUrl, '/discovery/v2/events.json');
var classificationsUrl = joinUrlElements( baseUrl, '/discovery/v2/classifications.json');

function joinUrlElements() {
  var re1 = new RegExp('^\\/|\\/$', 'g'),
      elts = Array.prototype.slice.call(arguments);
  return elts.map(function(element){
    if ( ! element) {return '';}
    return element.replace(re1,""); }).join('/');
}


function MainController ($scope, $http, $q  /*, $modal , $httpProvider , $compile */ ) {
  var reUrl = new RegExp('https?://[^/]+(/.*)$');
  var stopSending = false;

  function trimit(s) { return s.trim(); }

  $scope.eventCollection = [];
  $scope.stShadowCollection = [];
  $scope.totalAvailable = 0;
  $scope.sortKey = 'text';
  $scope.sortReverse = false;
  $scope.priorities = [ { num:1, name:'high'}, {num:2, name:'normal'}, {num:3, name:'low'}];
  $scope.securityContext = null;
  $scope.itemsPerPage = DISPLAY_ITEMS_PER_PAGE;
  $scope.retrieverPromise = null;
  $scope.classifications = [];

  $scope.filter = {
    nameText : '',
    cityText : '',
    venueText : '',
    complete : 0,
    priorityOptions : [ { num:0,name:'any'},
                        { num:1, name:'high'}, {num:2, name:'normal'}, {num:3, name:'low'}]
  };

  init();

  function retrieveEvents() {
    function finish() { $scope.retrieverPromise = null; }
    function start() {
      $scope.retrieverPromise = getOnePageOfEvents(searchContext, 0).finally(finish);
    }
    log.write('get items from TM ' + shortUrl(eventsUrl));
    var searchContext = { };
    if ($scope.keyword){
      searchContext.keyword = $scope.keyword;
    }

    if ($scope.citystate) {
      var pair = $scope.citystate.split(',').map(trimit);
      if (pair && pair.length === 2) {
        searchContext.city = pair[0];
        searchContext.stateCode = pair[1];
      }
    }

    if ($scope.c12n) {
      searchContext.classificationId = $scope.c12n;
    }

    // do we have something to search on?
    if (Object.keys(searchContext).length > 0) {
      if ($scope.retrieverPromise) {
        stopSending = true;
        $scope.retrieverPromise.then(start);
      }
      else {
        start();
      }
    }
    else {
      // $scope.eventCollection = [];
      $scope.eventCollection.length = 0; // truncate
    }
  }

  function getOnePageOfEvents(context, page, deferred) {
    deferred = deferred || $q.defer(); // we need only one per search
    var params = {apikey:$scope.securityContext.apikey, page: page, size:ITEMS_PER_REQUEST};
    Object.keys(context).forEach(function(key){
      if (context[key]) {
        params[key] = context[key]; // city, keyword, other search terms
      }
    });
    if (page === 0) {
      stopSending = false;
      $scope.eventCollection.length = 0; // truncate
      //$scope.eventCollection = [];
    }

    $http.get(eventsUrl, {params: params})
      .then(function(response) {
        if (response.status === 200) {
          var data = response.data;
          if (page === 0) {
            $scope.totalAvailable = data.page.totalElements || 0;
          }

          if (data && data._embedded && data._embedded.events) {
            log.write('got ' + data._embedded.events.length + ' items');
            if (stopSending) {
              deferred.resolve({error:'stopped'});
            }
            else {
              // $scope.eventCollection =
              //   $scope.eventCollection.concat(data._embedded.events);
              // preserve the reference
              Array.prototype.push.apply($scope.eventCollection, data._embedded.events);
              // more pages to retrieve?
              if (data.page.hasOwnProperty('number') &&
                  data.page.totalPages && data.page.number + 1 < data.page.totalPages) {
                getOnePageOfEvents(context, data.page.number + 1, deferred);
              }
              else {
                //$scope.stShadowCollection = [].concat($scope.eventCollection);
                //$scope.itemsPerPage = 3;
                //$scope.itemsPerPage = DESIRED_ITEMS_PER_PAGE;
                deferred.resolve({});
              }
            }
          }
          else {
            deferred.resolve({error:'no data'});
          }
        }
        else {
          deferred.resolve({error:response.status});
        }
      }, function(response) {
        log.write('failed to get events: ' + response.status);
        deferred.resolve({error:'error', code:response.status});
      });

    return deferred.promise;
  }

  function init() {
    log.write('MainController');
    // check for existing, working apikey
    var apikey = window.localStorage.getItem(html5AppId + '.tm-apikey');
    if (apikey && apikey !== "null") {
      $scope.securityContext = {apikey: apikey, checked: true};
      retrieveClassifications();
    }
    else {
      $scope.securityContext = { checked : true }; // no key
    }
  }

  function retrieveClassifications() {
    var params = { apikey : $scope.securityContext.apikey};
    $http.get(classificationsUrl, {params: params})
      .then(function(response) {
        if (response.status === 200) {
          var data = response.data;
          if (data && data._embedded && data._embedded.classifications) {
            $scope.classifications = data._embedded.classifications.map(function(c){
              return { id: c.segment.id, name: c.segment.name, link: c._links.self.href };
            });
          }
        }
        log.write('retrieved classifications: ' + $scope.classifications.length);
      });
  }

  function shortUrl(url) {
    var m = reUrl.exec(url);
    if ( ! m) {return '??';}
    return m[1];
  }

  $scope.search = function() {
      retrieveEvents();
  };

  $scope.stopSearch = function() {
      if ($scope.retrieverPromise) {
        stopSending = true;
      }
  };

  $scope.storeApiKey = function() {
    var apikey = $scope.securityContext.pendingApikey;
    delete $scope.securityContext.pendingApikey;
    $scope.securityContext.apikey = apikey;
    window.localStorage.setItem(html5AppId + '.tm-apikey', apikey);
  };

  $scope.forgetKey = function() {
    delete $scope.securityContext.apikey;
    window.localStorage.removeItem(html5AppId + '.tm-apikey');
  };

  $scope.itemNormalizationFunction = function(item) {
    var val = item[$scope.sortKey];
    if ($scope.sortKey === 'created' || $scope.sortKey === 'completed' || $scope.sortKey === 'due') {
      if (isNaN(val)) { return 0;}
      return val;
    }
    return val;
  };


  $scope.setSort = function($event) {
    var oldKey = $scope.sortKey,
        header = $event.currentTarget.innerHTML;
    if (header === 'Desc'){
      $scope.sortKey = 'text';
    }
    else if (header === '?'){
      $scope.sortKey = 'done';
    }
    if (oldKey === $scope.sortKey) {
      $scope.sortReverse = !$scope.sortReverse;
    }
    else {
      $scope.sortReverse = false;
    }
  };

  // $scope.getShownEvents = function () {
  //   return $scope.stShadowCollection.length;
  // };

  $scope.filtered = function(item) {
    var include = true;

    // 1. filter on name
    if (include && $scope.filter.nameText) {
      include = (item.name.indexOf($scope.filter.nameText) > -1);
    }

    // 2. filter on venue
    if (include && $scope.filter.venueText && $scope.filter.venueText.length > 0) {
      include = event._embedded.venue.find(function(venue){
        return (venue.name.indexOf($scope.filter.venueText) > -1);
      });
    }

    // 3. filter on city
    if (include && $scope.filter.cityText && $scope.filter.cityText.length > 0) {
      include = item._embedded.venue.find(function(venue){
        try {

        if ( ! venue.city || !venue.city.name) {return false;}
          return (venue.city.name.indexOf($scope.filter.cityText) > -1);
        }
        catch (e) {
          log('Exception while finding: ' + e);
        }
      });
    }

    return include;
  };
}


// this is used in views/main.htm to collapse the log viewer panel
function CollapseDemoController($scope) {
  $scope.isCollapsed = true;
  $scope.getButtonSymbol = function() {
    return ($scope.isCollapsed) ? '<' : '>';
  };
}

angular
  .module('tmApp1')
  .controller('MainController', ['$scope', '$http', '$q', MainController])
  .controller('CollapseDemoController', ['$scope', CollapseDemoController]);
