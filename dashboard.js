(function () {
	
  var margin = {
    top: 25,
    right: 100,
    bottom: 100,
    left: 100
  },
    width = 800,
    height = 400;
    
  var x = d3.time.scale()
    .range([0,width])
  
  var y = d3.scale.linear()
    .rangeRound([height, 0]);
  
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(function (d) {
      var format = d3.time.format("%B %d - %I %p");
      return format(new Date(d));
    });
  
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
  
  var line = d3.svg.line()
    .interpolate("linear")
    .x(function (d) {
      return x((new Date(d.date)).getTime())
    })
    .y(function (d) {
      return y(d.duration);
    });
  
  var color = d3.scale.ordinal()
    .range(["#272822", "#F92672", "#66D9EF", "#A6E22E", "#FD971F"]);
  
  var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
  var tooltip = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);
  
  //read live data from cloudant
  var db = new PouchDB('http://pouchdb.cloudant.com/performance_results');
  db.allDocs({"include_docs": true}).then(function(docs) {
  
    var data = new Array();
    for (var i = 0; i < docs.rows.length; i++) {
      if (docs.rows[i].doc.branch === 'master' &&
          docs.rows[i].doc.pull_request === 'false') {
        data.push(docs.rows[i]);
      }
    }

    var varNames = (function () {
      var item = data[0].doc;
      var arr = [];
      for (var key in item) {
        if (typeof item[key] === 'object' &&
            item[key].hasOwnProperty('duration')) {
          arr.push(key);
        }
      }
      return arr;
    })();

    color.domain(varNames);
  
    var resultsData = varNames.map(function (name) {
      return {
        name: name,
        details: data.map(function (d) {
          return {
            name: name,
            date: d.doc.date,
            duration: d.doc[name].duration,
            branch: d.doc.branch,
            client: d.doc.client,
            commit: d.doc.commit.substr(0,6)
          };
        })
      };
    });
  
    x.domain([
      d3.min(resultsData, function (c) {
        return d3.min(c.details, function (d) {
          date = new Date(d.date);
          date.setHours(0);
          date.setMinutes(0);
          return date.getTime();
        });
      }),
      d3.max(resultsData, function (c) {
        return d3.max(c.details, function (d) {
          date = new Date(d.date);
          date.setHours(0);
          date.setMinutes(0);
          date.setDate(date.getDate() + 1);
          return date.getTime();
        });
      })
    ]);
  
    y.domain([
      d3.min(resultsData, function (c) {
        return d3.min(c.details, function (d) {
          return d.duration;
        });
      }),
      d3.max(resultsData, function (c) {
        return d3.max(c.details, function (d) {
          return d.duration;
        });
      })
    ]);
  
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-1em")
        .attr("dy", ".15em")
        .attr("transform", function(d) {
            return "rotate(-30)" 
            });
  
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Duration (ms)");
  
    var results = svg.selectAll(".results")
      .data(resultsData)
      .enter().append("g")
      .attr("class", "results");
  
    results.append("path")
      .attr("class", "line")
      .attr("d", function (d) {
        return line(d.details);
      })
      .style("stroke", function (d) {
        return color(d.name);
      })
      .style("stroke-width", "1px")
      .style("fill", "none")
	
    function formatDetails(d) {
      details = [];
      duration = "Duration: " + d.duration;
      branch = "Branch: " + d.branch;
      commit = "Commit: " + d.commit;
      if (d.client.engine != undefined) {
        engine = "Engine: " + d.client.engine.name +" "+ d.client.engine.version;
        browser = "Browser: " + d.client.browser.name +" "+ d.client.browser.version;
        details = [duration, branch, commit, engine, browser];
      }
      else {
        client = "Client: " + d.client;
        details = [duration, branch, commit, client];
      }
      details = details.join("<br>");
      return details;
    }
	
    results.selectAll(".point")
      .data(function (d) {
        return d.details;
      })
      .enter().append("circle")
      .attr("class", "point")
      .attr("cx", function (d) {
        var da = new Date(d.date)
        return x(da.getTime());
      })
      .attr("cy", function (d) {
        return y(d.duration);
      })
      .attr("r", "3px")
      .style("fill", function (d) {
        return color(d.name);
      })
      .on("mouseover", function(d) {
        var details = formatDetails(d);
        tooltip.transition()
          .duration(250)
          .style("opacity", .9);
        tooltip.html(details)
          .style("left", (d3.event.pageX - 30) + "px")
          .style("top", (d3.event.pageY + 15) + "px");
        d3.select(this)
          .attr("r", "4px");
      })
      .on("mouseout", function(d) {
        tooltip.transition()
          .duration(250)
          .style("opacity", 0);
        d3.select(this)
          .attr("r", "3px");
      });
  
    var legend = svg.selectAll(".legend")
      .data(varNames.slice().reverse())
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function (d, i) {
        return "translate(55," + i * 20 + ")";
      });
  
    legend.append("rect")
      .attr("x", width - 10)
      .attr("width", 10)
      .attr("height", 10)
      .style("fill", color)
  
    legend.append("text")
      .attr("x", width - 12)
      .attr("y", 6)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function (d) {
        return d;
      });
  
  });
})();
