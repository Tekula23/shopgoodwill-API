var cheerio   = require('cheerio');
var request   = require('request');
var tidy      = require('htmltidy').tidy;
var moment 		= require('moment-timezone');
var url       = require('url');
var http      = require('http');
var ua 				= require('universal-analytics');
var tools			= require('./tools');

// var sizeOf    = require('image-size');
// var imagesize = require('imagesize');

exports.listAuctions = function(req, res){
  var searchResults = {
    total: 0,
    totalPages: 0,
    results: []
  };
  var perPageTotal = 25;
  var queryCat = 1;
  var querySeller = "all";
  var queryPage = 1;
  var queryTerm = "";
  var querySortBy = "itemEndTime";
  var visitor = ua(process.env.GA_UA);

  //Set default timezone
  moment.tz.setDefault("America/Los_Angeles");

  if(req.query.page) {
    queryPage = req.query.page;
  }
  if(req.params.page) {
    queryPage = req.params.page;
  }
  if(req.query.cat) {
    queryCat = req.query.cat;
  }
  if(req.params.cat) {
    queryCat = req.params.cat;
  }
  if(req.query.seller) {
    querySeller = req.query.seller;
  }
  if(req.params.seller) {
    querySeller = req.params.seller;
  }
  if(req.query.term) {
    queryTerm = req.query.term;
  }
  if(req.params.term) {
    queryTerm = req.params.term;
  }
  if(req.query.sortBy) {
    querySortBy = req.query.sortBy;
  }
  if(req.params.sortBy) {
    querySortBy = req.params.sortBy;
  }

  var url = {
    base:   'http://www.shopgoodwill.com/search/listByCat.asp?SortOrder=a&',
    page:   queryPage,
    seller: querySeller,
    cat:    queryCat,
    title:  queryTerm,
    sort:   querySortBy,
    min:    null,
    max:    null,
    get full () {
      var auctionListURL = this.base+'sortBy='+this.sort+'&catID='+this.cat+'&page='+this.page+'&ending=EndingToday';
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
      searchResults.total = parseInt(totalSearchResults);
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
        ec: "Auctions",
        ea: "getAuctions",
        el: "Total Results",
        ev: totalSearchResults,
        dp: req.originalUrl
      };
      visitor.event(paramsResults, function (err) {
        if(err){
          console.log("Error: Unable to track the results.");
          console.log(err);
        }
      });
    }
    console.log("Total search results: " + totalSearchResults);


    // iterate over rows and pull out available data
    if (itemRows.length < 1) {
      console.log("getAuctions: itemRows.length < 1");
      res.status(204).send({ error: "looks like this isn't a real page. I mean don't get me wrong. It's there, but there's no table on the page." });
    }
    else {
      itemRows.each(function(i, el) {
        var auction = {};
        var itemTH = $(el).children('th');
        auction.id = itemTH.eq(0).html().trim();
        auction.title = itemTH.eq(1).children('a').html();
        auction.title = tools.cleanTitle(auction.title);
        auction.url = itemTH.eq(1).children('a').attr('href');
        auction.img = itemTH.eq(1).children('img').attr('src');
        auction.thumbnail = auction.img;//.replace("-thumb","");
        auction.price = itemTH.eq(2).find('b').html();
        auction.price = auction.price.replace("$","");
        auction.price = auction.price.replace("&nbsp;"," ");
        auction.price = auction.price.trim();
        auction.bids = parseInt(itemTH.eq(3).text());
        auction.end = itemTH.eq(4).text();
        auction.endDate = itemTH.eq(4).text();
  			if(auction.end.indexOf('in') === -1){
  				var tEnd = moment(auction.end, 'MM/DD/YYYY hh:mm:ss a').fromNow();
  				auction.end = tEnd;
  			} else {
  				auction.end = auction.end.replace(/\sPT/gim,'');
  			}
        searchResults.results.push(auction);
        if(itemRows.length === i+1) {
          // console.log("sending JSON");
          sendJSON();
        }
      }); // end itemRows.each
    } // end else
  }; // end scrapeItems

  /**
   * getImageSize
   */
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
