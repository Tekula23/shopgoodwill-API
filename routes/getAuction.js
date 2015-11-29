var cheerio	 	= require('cheerio');
var request	 	= require('request');
var tidy			= require('htmltidy').tidy;
var moment 		= require('moment-timezone');
var url	 			= require('url');
var http			= require('http');
var ua 				= require('universal-analytics');
var Entities 	= require('html-entities').AllHtmlEntities;

// var sizeOf	= require('image-size');
// var imagesize = require('imagesize');

exports.viewAuction = function(req, res){
	var item = {};
	var queryId = "";
	var itemURL = "";
	var visitor = ua(process.env.GA_UA);

	//Set default timezone
	moment.tz.setDefault("America/Los_Angeles");

	if(req.query.id) {
		queryId = req.query.id;
	}
	if(req.params.id) {
		queryId = req.params.id;
	}
	console.log("id: " + queryId);
	var url = {
		base: 'http://www.shopgoodwill.com/viewItem.asp?',
		id: queryId,
		get full () {
			itemURL = this.base + 'itemID=' + this.id;
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

		entities = new Entities();

		// iterate over rows and pull out available data
		if (itemCols.length < 1) {
			res.status(204).send({ error: "There was an issue finding the item details." });
		} else {

			var firstCol = itemCols.eq(0).children('table').children('tr'); //image
			var secondCol = itemCols.eq(1).find('table').children('tr').children('td'); //main content
			var thirdCol = itemCols.eq(2).children('table').children('tr'); //bidding content
			//console.log(thirdCol);
			item.id = parseInt(secondCol.eq(1).html().trim());
			itemTitle = itemTitle.replace(/(\r\n|\n|\r)/gm," ");
			itemTitle = itemTitle.replace(/(~)/gim,"");
			itemTitle = itemTitle.replace(/(�)/gim,"&nbsp;");
			item.title = itemTitle;
			item.title = entities.decode(item.title);
			item.title = updateSizes(item.title);
			item.price = $('[itemprop="price"]').text().trim().replace(/(&nbsp;|\$)/gim,'');
			// item.price = $('[itemprop="price"]').text();
			item.description = $('[itemprop="description"]').text().trim().replace(/&nbsp;/gim,'');
			item.description = item.description.replace(/description:|Description:/,'').trim();
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
			}

			//Gallery images
			var galleryImages = $('.itemdetaildesc2 #details').first('center').find('a');
			item.gallery = [];
			if(typeof galleryImages !== 'undefined'){
				galleryImages.each(function(i, key){
					if(typeof key !== 'undefined'){
						if(typeof $(key).attr('href') !== 'undefined'){
							item.gallery.push({
								img: $(key).attr('href')
							});
						}
					}
				});
			}

			item.start = secondCol.eq(3).text();
			item.startDate = secondCol.eq(3).text();
			item.start = item.start.replace(/PT/gim,'');
			// item.start = moment(item.start);
			if(item.start.indexOf('in') === -1){
				var tStart = moment(item.start, 'MM/DD/YYYY hh:mm:ss a').fromNow();
				item.start = tStart;
			} else {
				item.start = item.start.replace(/PT/gim,'');
			}
			item.endDate = secondCol.eq(4).text();
			item.end = secondCol.eq(4).text();
			item.end = item.end.replace(/PT/gim,'');
			// item.end = moment(item.end);
			if(item.end.indexOf('in') === -1){
				var tEnd = moment(item.end, 'MM/DD/YYYY hh:mm:ss a').fromNow();
				item.end = tEnd;
			} else {
				item.end = item.end.replace(/PT/gim,'');
			}

			if(secondCol.eq(5).html()){
				item.seller = secondCol.eq(5).html().trim();
				item.seller = item.seller.replace(/(\r\n|\n|\r|<br>)/gim, '');
				item.seller = item.seller.replace(/(We'd like your feedback on this seller\.)/gim, '');
				item.seller = item.seller.replace(/(<a.*>|<\/a>)/gim,'').trim();
				item.seller = item.seller.replace(/(<b>|<\/b>)/gim,'').trim();
			}
			if(secondCol.eq(6).text()){
				item.location = secondCol.eq(6).text().trim();
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
			}
			if(secondCol.eq(8).html()){
				item.shipping = secondCol.eq(8).text().trim();
				item.shipping = item.shipping.replace(/(\r\n|\n|\r|<br>)/gim, ' ');
				item.shipping = item.shipping.replace(/(<a.*>|<\/a>)/gim,'').trim();
				item.shipping = item.shipping.replace(/(<b>|<\/b>)/gim,'').trim();
				item.shipping = item.shipping.replace(/(<em>|<\/em>)/gim,'').trim();
				item.shipping = item.shipping.replace(/(&nbsp;)/gim,'').trim();
			}
			if(secondCol.eq(9).html()){
				item.returnPolicy = secondCol.eq(9).text().trim();
				item.returnPolicy = item.returnPolicy.replace(/(&nbsp;)/gim,'').trim();
				item.returnPolicy = item.returnPolicy.replace(/(\r\n|\n|\r|<br>)/gm, ' ');
			}
			if(secondCol.eq(10).html()){
				item.highBidder = secondCol.eq(10).html().trim();
				item.highBidder = item.highBidder.replace(/(\r\n|\n|\r|<br>)/gm, ' ');
				item.highBidder = item.highBidder.replace(/(&nbsp;)/gim,'').trim();
				item.highBidder = item.highBidder.replace(/(\s\s|\t)/gm, ' ');
				item.highBidder = item.highBidder.replace(/<b>(.*)<\/b>.*/, '$1');
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
			}

			//Analytics
			var paramsTitle = {
				ec: "Auction",
				ea: "getAction",
				el: "Title",
				ev: item.title,
				dp: req.originalUrl
			};
			visitor.event(paramsTitle, function (err) {
				if(err){
					console.error("Error: Unable to track the title.");
					console.error(err);
				}
			});
			var paramsPrice = {
				ec: "Auction",
				ea: "getAction",
				el: "Price",
				ev: item.price,
				dp: req.originalUrl
			};
			visitor.event(paramsPrice, function (err) {
				if(err){
					console.error("Error: Unable to track the price.");
					console.error(err);
				}
			});
			//End analytics

			//Process the request
			sendJSON();
		} // end else
	}; // end scrapeItems

	var getImageSize = function() {
		var getImage = http.get(auction.itemImage, function (response) {
			imagesize(response, function (err, result) {
				if(err) {
					console.error(err);
				}
				auction.itemH = result.height;
				auction.itemW = result.width;
				auction.imageRatio = result.height/result.width;
				// addAuction(auction, i, itemRows.length);
				getImage.abort();
			}); // end imagesize
		}); // end getImage
	};

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

	/**
   * Helper to change clothes sizes toUpperCase that were changed via change-case.
   * @param str
   */
  var updateSizes = function(str){
    return str.replace(/(XXL|XL|LRG|XXXL|SML|MED|NWT)/gi, function(a, l) { return l.toUpperCase(); });
  };

	request(url.full, function(error, response, body) {
		if(error) {
			console.error(error);
			res.jsonp(error);
		} else {
			// console.log("Dirty HTML received");
			tidyPage(body);
		}
	});

};
