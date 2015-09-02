var cheerio   = require('cheerio');
var request   = require('request');
var tidy      = require('htmltidy').tidy;
var moment    = require('moment');
var url       = require('url');
var http      = require('http');

// var sizeOf    = require('image-size');
// var imagesize = require('imagesize');

exports.viewItem = function(req, res){
	var item = {};
  var queryTitle = "";
  var queryId = "";
	var itemURL = "";


  var url = {
    base:   'http://www.shopgoodwill.com',
    get full () {
			itemURL = this.base;
      return itemURL;
    }
  };

	/**
	 * sanitize
	 * Helper method that sanitizes/converts the auction title to one used on shopgoodwill.com. See example below.
	 * ex. http://www.shopgoodwill.com/auctions/King-James-Version-Paperback-New-Testament-23794420.html
	 * @param str
	 */
	var sanitize = function(str){
		str = str.replace(/[^\w-]/g, '-');
		return str;
	};

  var scrapeItems = function(html) {
    //console.log(html);
    var $ = cheerio.load(html);
    // get a cheerio object array of the table rows
    var galleryItem = $('.galleryitembox');
    // iterate over rows and pull out available data
    if (!galleryItem) {
      console.log("Unable to find gallery item.");
      res.status(204).send({ error: "There was an issue finding the gallery item." });
    } else {

			item.title = $(galleryItem).children('b').children('a').first().text().trim();
			item.title = item.title.replace(/(\r\n|\n|\r)/gm," ");
			item.title = item.title.replace(/(~)/gim,"");
			item.title = item.title.replace(/(�)/gim," ");
			item.url = $(galleryItem).children('a').first().attr('href');//.replace(/\/auctions\//gi,'');
			item.img = $(galleryItem).children('a').children('img').first().attr('src');
			item.id = item.url.replace(/.*-([0-9]*)?\.html/gim,'$1');
			console.log(item.id);
      sendJSON();
    }; // end else
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
  }

  var sendJSON = function() {
		var items = {};
		items = item;
    res.jsonp(items);
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

}
