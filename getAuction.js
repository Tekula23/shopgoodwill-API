var cheerio   = require('cheerio');
var request   = require('request');
var tidy      = require('htmltidy').tidy;
var moment    = require('moment');
var url       = require('url');
var http      = require('http');

// var sizeOf    = require('image-size');
// var imagesize = require('imagesize');

exports.viewAuction = function(req, res){
	var item = {};
  var queryTitle = "";
  var queryId = "";

  if(req.query.id) {
    queryId = req.query.id;
  };
  if(req.params.id) {
    queryId = req.params.id;
  };
  if(req.query.title) {
    queryTitle = req.query.title;
  };
  if(req.params.title) {
    queryTitle = req.params.title;
  };
	console.log("id: " + queryId);
	console.log("title: " + queryTitle);
  var url = {
    base:   'http://www.shopgoodwill.com/auctions',
    id:  queryId,
    title:  queryTitle,
    get full () {
			var itemURL = this.base + '/' + sanitize(this.title) + '-' + this.id + '.html';
			console.log(itemURL);
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
    var itemCols = $('div.itemdetail').children('div').children('div');

    // iterate over rows and pull out available data
    if (itemCols.length < 1) {
      console.log("less than");
      res.status(204).send({ error: "looks like this isn't a real page. I mean don't get me wrong. It's there, but there's no table on the page." });
    } else {
			var firstCol = itemCols.eq(0).children('table').children('tr'); //image
			var secondCol = itemCols.eq(1).find('table').children('tr').children('td'); //main content
			var thirdCol = itemCols.eq(2).children('table').children('tr'); //bidding content
			//console.log(thirdCol);
			var imgSrc = $(firstCol).eq(1).children('td').find('img').attr('src');
			item.img = (imgSrc) ? imgSrc : "";
      item.id = secondCol.eq(1).html().trim();
      // auction.title = itemTH.eq(1).children('a').html();
      // auction.title = auction.title.replace(/(\r\n|\n|\r)/gm,"");
      // auction.url = itemTH.eq(1).children('a').attr('href');
      // auction.img = itemTH.eq(1).children('img').attr('src');
      // auction.img = auction.img.replace("-thumb","");
      // auction.price = itemTH.eq(2).find('b').html();
      // auction.price = auction.price.replace("$","");
      // auction.bids = itemTH.eq(3).html();
      // auction.end = itemTH.eq(4).html();
      // auction.end = moment(auction.end, 'M/D/YYYY h:m:s a').fromNow();
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
    res.jsonp(item);
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
