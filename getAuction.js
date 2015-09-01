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
	var itemURL = "";

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
			itemURL = this.base + '/' + sanitize(this.title) + '-' + this.id + '.html';
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
    var itemTitle = $('div.itemdetail h1#title').children('span').text();
		var itemCols = $('div.itemdetail').children('div').children('div');

    // iterate over rows and pull out available data
    if (itemCols.length < 1) {
      console.log("less than");
      res.status(204).send({ error: "There was an issue finding the item details." });
    } else {

			var firstCol = itemCols.eq(0).children('table').children('tr'); //image
			var secondCol = itemCols.eq(1).find('table').children('tr').children('td'); //main content
			var thirdCol = itemCols.eq(2).children('table').children('tr'); //bidding content
			//console.log(thirdCol);
      item.id = parseInt(secondCol.eq(1).html().trim());
			item.title = itemTitle;
			item.price = parseFloat($('[itemprop="price"]').text().trim().replace(/(&nbsp;|\$)/gim,'')).toFixed(2);
			item.description = $('[itemprop="description"]').text().trim().replace(/&nbsp;/gim,'');
			item.url = itemURL;
			if(!item.id){
				res.status(204).send({ error: "There was an issue collecting the item details." });
			}
			var imgSrc = $(firstCol).eq(1).children('td').find('img').attr('src');
			item.img = (imgSrc) ? imgSrc : "";
			item.thumbnail = item.img;
			item.img = item.img.replace("-thumb","");
			if(secondCol.eq(2).html()){
      	item.quanitity = secondCol.eq(2).html().trim();
				console.log("item.quanitity: " + item.quanitity);
			}

			if(secondCol.eq(3).html()){
      	item.start = moment(secondCol.eq(3).html().trim(),'M/D/YYYY h:m:s a').fromNow();
				console.log("item.start: " + item.start);
			}
			if(secondCol.eq(4).html()){
      	item.end = moment(secondCol.eq(4).html().trim(),'M/D/YYYY h:m:s a').fromNow();
				console.log("item.end: " + item.end);
			}
			if(secondCol.eq(5).html()){
				item.seller = secondCol.eq(5).html().trim();
				item.seller = item.seller.replace(/(\r\n|\n|\r|<br>)/gim, '');
				item.seller = item.seller.replace(/(We'd like your feedback on this seller\.)/gim, '');
      	item.seller = item.seller.replace(/(<a.*>|<\/a>)/gim,'').trim();
      	item.seller = item.seller.replace(/(<b>|<\/b>)/gim,'').trim();
				console.log("item.seller: " + item.seller);
			}
			if(secondCol.eq(6).text()){
      	item.location = secondCol.eq(6).text().trim();
				console.log("item.location: " + item.location);
			}
			if(secondCol.eq(7).html()){
      	item.payment = secondCol.eq(7).text().trim();
      	item.payment = item.payment.replace(/Available Payment Methods:/gi,'').trim();
      	item.payment = parseFloat(item.payment.replace(/or \(Through PayPal\)/gi,'').trim());
				// item.payment = item.payment.replace(/(<!--.*-->)/gim, ''); //Remove commented items
				// item.payment = item.payment.replace(/(\r\n|\n|\r|<br>)/gim, ' ');
      	// item.payment = item.payment.replace(/(<a.*>|<\/a>)/gim,'').trim();
      	// item.payment = item.payment.replace(/(<b>|<\/b>)/gim,'').trim();
      	// item.payment = item.payment.replace(/(<em>|<\/em>)/gim,'').trim();
      	// item.payment = item.payment.replace(/(&nbsp;)/gim,'').trim();
				console.log("item.payment: " + item.payment);
			}
			if(secondCol.eq(8).html()){
      	item.shipping = secondCol.eq(8).text().trim();
				item.shipping = item.shipping.replace(/(\r\n|\n|\r|<br>)/gim, ' ');
      	item.shipping = item.shipping.replace(/(<a.*>|<\/a>)/gim,'').trim();
      	item.shipping = item.shipping.replace(/(<b>|<\/b>)/gim,'').trim();
      	item.shipping = item.shipping.replace(/(<em>|<\/em>)/gim,'').trim();
      	item.shipping = item.shipping.replace(/(&nbsp;)/gim,'').trim();
				console.log("item.shipping: " + item.shipping);
			}
			if(secondCol.eq(9).html()){
      	item.returnPolicy = secondCol.eq(9).text().trim();
				item.returnPolicy = item.returnPolicy.replace(/(&nbsp;)/gim,'').trim();
				item.returnPolicy = item.returnPolicy.replace(/(\r\n|\n|\r|<br>)/gm, ' ');
				console.log("item.returnPolicy: " + item.returnPolicy);
			}
			if(secondCol.eq(10).html()){
				item.highBidder = secondCol.eq(10).html().trim();
				item.highBidder = item.highBidder.replace(/(\r\n|\n|\r|<br>)/gm, ' ');
				item.highBidder = item.highBidder.replace(/(&nbsp;)/gim,'').trim();
				item.highBidder = item.highBidder.replace(/(\s\s|\t)/gm, ' ');
				item.highBidder = item.highBidder.replace(/<b>(.*)<\/b>.*/, '$1');
				console.log("item.highBidder: " + item.highBidder);
			}
			if(secondCol.eq(11).html()){
				item.bids = secondCol.eq(11).text().trim();
				item.bids = item.bids.replace(/(\r\n|\n|\r|<br>)/gm, ' ');
				item.bids = item.bids.replace(/(&nbsp;)/gim,'').trim();
				item.bids = item.bids.replace(/(\s\s|\t)/gm, ' ');
				item.bids = parseInt(item.bids.replace(/\(.*\)/, '').trim());
				if(typeof item.bids === 'undefined' || item.bids < 0){
					item.bids = 0;
				}
				console.log("item.bids: " + item.bids);
			}
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