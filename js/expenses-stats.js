// expenses-stats.js

// create charts for analysis on stats.html
$$(document).on('pageInit', '.page[data-page="stats"]', function (e) {
  // handler for selection
  $("#form-stats-date-start").on('change', onStatsDateChange);
  $("#form-stats-date-end").on('change', onStatsDateChange);

  // draw charts
  Charts.draw();
});

// handler for date changes in selection
function onStatsDateChange(e) {
  var date = $(e.delegateTarget).val();
  var validDate;

  if(date == undefined || date == null || date.length == 0 || Date.parse(date) == NaN) {
    validDate = 0;
  } else {
    validDate = Date.parse(date);
  }

  // start or end
  if ($(e.delegateTarget).attr('id') == "form-stats-date-start")
    Charts.filter.timestamp.start = validDate;
  else
    Charts.filter.timestamp.end = validDate;

  // update charts
  Charts.draw();
}

// all Charts
var Charts = {
  // selection filter
  filter: {
    timestamp: {
      start: 0,
      end: Date.now()
    },
    account: ""
  },

  // filter functions
  filterFunc: {
    timestamp: function(item) {
      return Charts.filter.timestamp.start <= item.timestamp && Charts.filter.timestamp.end >= item.timestamp;
    },
    account: function() {
      return Charts.filter.account === "" || Charts.filter.account == item.account;
    },
    all: function(item) {
      return Charts.filterFunc.timestamp(item) && Charts.filterFunc.account(item);
    }
  },

  // draw all charts
  draw: function() {
    this.categoryPie();
    this.weekdayBar();
  },

  // category chart
  categoryPie: function() {
    var _data = {labels:[],series:[]};

    // query data: categories and for each sum price and leave out categories with no items
    var _cats = db.queryAll('category',{sort: [['order', 'ASC']]});
    $.each(_cats, function(i,cat) {
        var _items = db.query('item',function(item) {
          return item.category === cat.uniqueid && Charts.filterFunc.all(item);
        });

        if(_items.length > 0) {
          var index = _data.labels.length;
          _data.labels[index] = cat.description;
          _data.series[index] = 0;
          $.each(_items, function(j,item){
            _data.series[index] += item.price;
          });
        }
    });

    // set option for labels with name and value
    var _options = {
      labelInterpolationFnc: function(value,index) {
        return value + ": " + _data.series[index];
      }
    };

    // draw Pie chart (in .exp-stats-pie)
    new Chartist.Pie(".exp-stats-pie", _data, _options);
  },

  // per weekday chart
  weekdayBar: function() {
    var _data = {labels:[],series:[[0,0,0,0,0,0,0]]};
    _data.labels = i18n.weekday;

    // set options (dfault)
    var _options = {
      high: 50,
      low: -50
    };

    // query data
    var _items = db.query('item', Charts.filterFunc.all);
    $.each(_items, function(i,item) {
      _data.series[0][(new Date(item.timestamp)).getDay()] += item.price;
    });

    // set bounds for chart
    $.each(_data.series[0], function(i,v) {
      _options.high = v > _options.high ? v : _options.high;
      _options.low = v < _options.low ? v : _options.low;
    });

    // draw chart (in .exp-stats-weekday)
    new Chartist.Bar('.exp-stats-weekday', _data, _options);
  }
};
