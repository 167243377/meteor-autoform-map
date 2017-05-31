var KEY_ENTER, defaults, initTemplateAndGoogleMaps, markers;

KEY_ENTER = 13;

defaults = {
  mapType: 'roadmap',
  defaultLat: 1,
  defaultLng: 1,
  geolocation: false,
  searchBox: false,
  autolocate: true,
  zoom: 8,
  libraries: 'places',
  key: '',
  language: 'en',
  direction: 'ltr',
  geoCoding: false,
  geoCodingCallBack: null,
  animateMarker: false
};

markers = {};

AutoForm.addInputType('map', {
  template: 'afMap',
  valueOut: function() {
    var lat, lng, node;
    node = $(this.context);
    lat = node.find('.js-lat').val();
    lng = node.find('.js-lng').val();
    if ((lat != null ? lat.length : void 0) > 0 && (lng != null ? lng.length : void 0) > 0) {
      return {
        lat: lat,
        lng: lng
      };
    }
  },
  contextAdjust: function(ctx) {
    ctx.loading = new ReactiveVar(false);
    return ctx;
  },
  valueConverters: {
    string: function(value) {
      if (this.attr('reverse')) {
        return value.lng + "," + value.lat;
      } else {
        return value.lat + "," + value.lng;
      }
    },
    numberArray: function(value) {
      return [value.lng, value.lat];
    }
  }
});

Template.afMap.created = function() {
  this.mapReady = new ReactiveVar(false);
  this.options = _.extend({}, defaults, this.data.atts);
  if (typeof google !== 'object' || typeof google.maps !== 'object') {
    GoogleMaps.load({
      libraries: this.options.libraries,
      key: this.options.key,
      language: this.options.language
    });
  }
  this._stopInterceptValue = false;
  this._interceptValue = function(ctx) {
    var location, t;
    t = Template.instance();
    if (t.mapReady.get() && ctx.value && !t._stopInterceptValue) {
      location = typeof ctx.value === 'string' ? ctx.value.split(',') : ctx.value.hasOwnProperty('lat') ? [ctx.value.lat, ctx.value.lng] : [ctx.value[1], ctx.value[0]];
      location = new google.maps.LatLng(parseFloat(location[0]), parseFloat(location[1]));
      t.setMarker(t.map, location, t.options.zoom);
      t.map.setCenter(location);
      t._stopInterceptValue = true;
      if (isNaN(t.data.marker.position.lat())) {
        return initTemplateAndGoogleMaps.apply(t);
      }
    }
  };
  this._getMyLocation = function(t) {
    if (!navigator.geolocation) {
      return false;
    }
    t.data.loading.set(true);
    return navigator.geolocation.getCurrentPosition((function(_this) {
      return function(position) {
        var location;
        location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        t.setMarker(t.map, location, t.options.zoom);
        t.map.setCenter(location);
        return t.data.loading.set(false);
      };
    })(this));
  };
  return this._getDefaultLocation = function(t) {
    var location;
    if (!navigator.geolocation) {
      return false;
    }
    t.data.loading.set(true);
    location = new google.maps.LatLng(t.options.defaultLat, t.options.defaultLng);
    t.map.setCenter(location);
    t.map.setZoom(t.options.defaultZoom);
    // t.setMarker(t.map, location, t.options.defaultLocationZoom);
    return t.data.loading.set(false);
  };
};

initTemplateAndGoogleMaps = function() {
  var input, mapOptions, myLocation, searchBox;
  this.data.marker = void 0;
  this.setMarker = (function(_this) {
    return function(map, location, zoom) {
      var markerOpts;
      if (zoom == null) {
        zoom = 0;
      }
      _this.$('.js-lat').val(location.lat());
      _this.$('.js-lng').val(location.lng());
      if (_this.data.marker) {
        _this.data.marker.setPosition(location);
        if (_this.data.marker.map !== _this.map) {
          _this.data.marker.setMap(_this.map);
        }
      } else if (markers[_this.data.name] !== void 0) {
        _this.data.marker = markers[_this.data.name].marker;
        _this.data.marker.setMap(markers[_this.data.name].map);
        _this.data.marker.setPosition(location);
      } else {
        markerOpts = {
          position: location,
          map: _this.map
        };
        if (_this.options.animateMarker) {
          markerOpts.animation = google.maps.Animation.DROP;
        }
        _this.data.marker = new google.maps.Marker(markerOpts);
        markers[_this.data.name] = {
          marker: _this.data.marker,
          map: _this.map
        };
      }
      if (zoom > 0) {
        _this.map.setZoom(zoom);
      }
      if (_this.geocoder !== void 0 && _this.options.geoCodingCallBack !== null) {
        return window[_this.options.geoCodingCallBack](_this, _this.geocoder, location);
      }
    };
  })(this);
  mapOptions = {
    zoom: 0,
    mapTypeId: google.maps.MapTypeId[this.options.mapType],
    streetViewControl: false
  };
  if (this.data.atts.googleMap) {
    _.extend(mapOptions, this.data.atts.googleMap);
  }
  this.map = new google.maps.Map(this.find('.js-map'), mapOptions);
  if (this.data.atts.searchBox) {
    input = this.find('.js-search');
    if (this.options.direction === 'rtl') {
      this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(input);
    } else {
      this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    }
    searchBox = new google.maps.places.SearchBox(input);
    google.maps.event.addListener(searchBox, 'places_changed', (function(_this) {
      return function() {
        var location;
        location = searchBox.getPlaces()[0].geometry.location;
        _this.setMarker(_this.map, location, _this.options.zoom);
        return _this.map.setCenter(location);
      };
    })(this));
    $(input).removeClass('af-map-search-box-hidden');
  }
  if (this.data.atts.geolocation) {
    myLocation = this.find('.js-locate');
    myLocation.addEventListener('click', (function(_this) {
      return function() {
        return _this._getMyLocation(_this);
      };
    })(this));
    if (this.options.direction === 'rtl') {
      this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(myLocation);
    } else {
      this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(myLocation);
    }
  }
  if (this.data.atts.autolocate && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((function(_this) {
      return function(position) {
        var location;
        location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        _this.setMarker(_this.map, location, _this.options.zoom);
        _this.map.setCenter(location);
        if (_this.options.geoCoding) {
          return _this.geocoder = new google.maps.Geocoder;
        }
      };
    })(this));
  } else {
    this._getDefaultLocation(this);
  }
  if (typeof this.data.atts.rendered === 'function') {
    this.data.atts.rendered(this.map);
  }
  google.maps.event.addListener(this.map, 'click', (function(_this) {
    return function(e) {
      return _this.setMarker(_this.map, e.latLng);
    };
  })(this));
  this.$('.js-map').closest('form').on('reset', (function(_this) {
    return function() {
      if (_this.data.atts.autolocate) {
        return _this._getMyLocation(_this);
      } else {
        return _this._getDefaultLocation(_this);
      }
    };
  })(this));
  return this.mapReady.set(true);
};

Template.afMap.onRendered(function() {
  return this.autorun((function(_this) {
    return function() {
      return GoogleMaps.loaded() && initTemplateAndGoogleMaps.apply(_this);
    };
  })(this));
});

Template.afMap.onDestroyed(function() {
  return delete markers[this.data.name];
});

Template.afMap.helpers({
  schemaKey: function() {
    Template.instance()._interceptValue(this);
    return this.atts['data-schema-key'];
  },
  width: function() {
    if (typeof this.atts.width === 'string') {
      return this.atts.width;
    } else if (typeof this.atts.width === 'number') {
      return this.atts.width + 'px';
    } else {
      return '100%';
    }
  },
  height: function() {
    if (typeof this.atts.height === 'string') {
      return this.atts.height;
    } else if (typeof this.atts.height === 'number') {
      return this.atts.height + 'px';
    } else {
      return '500px';
    }
  },
  loading: function() {
    return this.loading.get();
  }
});

Template.afMap.events({
  'click .js-locate': function(e) {
    return e.preventDefault();
  },
  'keydown .js-search': function(e) {
    if (e.keyCode === KEY_ENTER) {
      return e.preventDefault();
    }
  }
});