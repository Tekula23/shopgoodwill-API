var cheerio   = require('cheerio');
var request   = require('request');
var tidy      = require('htmltidy').tidy;
var moment    = require('moment');
var url       = require('url');
var http      = require('http');
var ua 				= require('universal-analytics');

// var sizeOf    = require('image-size');
// var imagesize = require('imagesize');

exports.listAuctions = function(req, res){
  var visitor = ua(process.env.GA_UA);
  var searchResults = {
    total: 0,
    totalPages: 0,
    results: []
  };
  var queryCat = 0;
  var querySeller = "all";
  var queryPage = 1;
  var queryTerm = "";

  var perPageTotal = 25;

  if(req.query.page) {
    queryPage = req.query.page;
  }
  if(req.params.page) {
    queryPage = req.params.page;
  }
  // if(req.query.cat) {
  //   queryCat = req.query.cat;
  // };
  // if(req.params.cat) {
  //   queryCat = req.params.cat;
  // };
  // if(req.query.seller) {
  //   querySeller = req.query.seller;
  // };
  // if(req.params.seller) {
  //   querySeller = req.params.seller;
  // };
  if(req.query.term) {
    queryTerm = req.query.term;
  }
  if(req.params.term) {
    queryTerm = req.params.term;
  }

  var url = {
    base:   'http://www.shopgoodwill.com/search/SearchKey.asp?showthumbs=on&sortBy=itemEndTime&closed=no&SortOrder=a&sortBy=itemEndTime&',
    page:   queryPage,
    // seller: querySeller,
    // cat:    queryCat,
    title:  queryTerm,
    min:    null,
    max:    null,
    get full () {
      var auctionListURL = this.base+'itemTitle='+this.title+'&page='+this.page; //+'&catID='+this.cat+'&sellerID='+this.seller
      console.log("Finding auction items for: " + auctionListURL);
      return auctionListURL;
    }
  };

  var scrapeItems = function(html) {
    //console.log(html);
    var $ = cheerio.load(html);
    // get a cheerio object array of the table rows
    var itemRows = $('table.productresults tbody').first().children('tr');
    var totalSearchResults = $('.mainbluebox h1.whitetext').html();
    if(totalSearchResults && typeof totalSearchResults !== 'undefined'){
      totalSearchResults = totalSearchResults.replace(/([0-9]+).*/gi,'$1');

      //Add the total search results
      searchResults.total = totalSearchResults;
      searchResults.totalPerPage = perPageTotal;

      //Add paging details
      if(totalSearchResults && perPageTotal){
        if(parseInt(totalSearchResults) > parseInt(perPageTotal)){
          searchResults.totalPages = Math.ceil(parseInt(totalSearchResults) / parseInt(perPageTotal));
        } else {
          searchResults.totalPages = 1;
        }
      }

      //Track the results
      var paramsResults = {
        ec: "Search",
        ea: "search",
        el: "Total Results",
        ev: totalSearchResults,
        dp: req.originalUrl
      };
      visitor.event(paramsResults, function (err) {
        console.log("Error: Unable to track the results.");
        console.log(err);
      });
    }
    console.log("Total search results: " + totalSearchResults);

    // iterate over rows and pull out available data
    if (itemRows.length < 1) {
      console.log("search: itemRows.length < 1");
      //res.status(204).send({ error: "looks like this isn't a real page. I mean don't get me wrong. It's there, but there's no table on the page." });
      searchResults.results.push({message: "No results found."});
      sendJSON();
    }
    else {
      itemRows.each(function(i, el) {
        var auction = {};
        var itemTH = $(el).children('th');
        auction.id = itemTH.eq(0).html().trim();
        auction.title = itemTH.eq(1).children('a').html();
        auction.title = auction.title.replace(/(\r\n|\n|\r)/gm,"");
        auction.url = itemTH.eq(1).children('a').attr('href');
        auction.img = itemTH.eq(1).children('img').attr('src');
        auction.thumbnail = auction.img.replace("-thumb","");
        auction.price = itemTH.eq(2).find('b').html();
        auction.price = auction.price.replace("$","");
        auction.bids = parseInt(itemTH.eq(3).text());
        auction.end = itemTH.eq(4).text();
        if(auction.end.indexOf('in') === -1){
          tEnd = moment(auction.end, 'M/D/YYYY h:m:s a').fromNow();
          auction.end = tEnd;
        } else {
          auction.end = auction.end.replace(/PT/gim,'');
        }
        searchResults.results.push(auction);
        if(itemRows.length === i+1) {
          // console.log("sending JSON");

          var paramsQuery = {
    				ec: "Search",
    				ea: "search",
    				el: "Query",
    				ev: queryTerm,
    				dp: req.originalUrl
    			};
    			visitor.event(paramsQuery, function (err) {
    				console.log("Error: Unable to track the query.");
    				console.log(err);
    			});
          sendJSON();
        }
      }); // end itemRows.each
    } // end else
  }; // end scrapeItems

  var getImageSize = function() {
    var getImage = http.get(auction.itemImage, function (response) {
      imagesize(response, function (err, result) {
        if(err) console.log(err);
        auction.itemH = result.height;
        auction.itemW = result.width;
        auction.imageRatio = result.height/result.width;
        // addAuction(auction, i, itemRows.length);
        getImage.abort();
      }); // end imagesize
    }); // end getImage
  };

  var sendJSON = function() {
    res.jsonp(searchResults);
  };

  var tidyPage = function(body) {
    tidy(body, function(err, html) {
      if(err){
        res.jsonp(err);
        return;
      } else {
        scrapeItems(html);
      }
    });
  };

  request(url.full, function(error, response, body) {
    if(error) {
      console.log(error);
      res.jsonp(error);
    } else {
      // console.log("Dirty HTML received");
      tidyPage(body);
    }
  });

};
