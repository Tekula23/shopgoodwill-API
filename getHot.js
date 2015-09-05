var cheerio		= require('cheerio');
var request		= require('request');
var tidy			= require('htmltidy').tidy;
var moment	 	= require('moment');
var url		 		= require('url');
var http			= require('http');
var ua 				= require('universal-analytics');
var Entities 		= require('html-entities').AllHtmlEntities;
var visitor 	= ua(process.env.GA_UA, {https: true});

// var sizeOf	 = require('image-size');
// var imagesize = require('imagesize');

exports.listHotAuctions = function(req, res){
	var auctionsArray = [];
	var queryCat = 0;
	var querySeller = "12";
	var queryPage = 1;
	var queryTerm = "";

	if(req.query.page) {
		queryPage = req.query.page;
	};
	if(req.query.cat) {
		queryCat = req.query.cat;
	};
	if(req.query.seller) {
		querySeller = req.query.seller;
	};
	if(req.query.term) {
		queryTerm = req.query.term;
	};

	var url = {
			//base:	'http://www.shopgoodwill.com/search/searchKey.asp?showthumbs=on&sortBy=itemEndTime&closed=no&SortOrder=a&sortBy=itemEndTime&',
			base:	'http://www.shopgoodwill.com/Listings/Hot50.asp',
			page:	queryPage,
			seller: querySeller,
			cat:	 queryCat,
			title:  queryTerm,
			min:	 null,
			max:	 null,
			get full () {
			return this.base; //+'itemTitle='+this.title+'&catid='+this.cat+'&sellerID='+this.seller+'&page='+this.page;
		}
	};

	var scrapeItems = function(html) {
		//console.log(html);
		var $ = cheerio.load(html);
		// get a cheerio object array of the table rows
		var itemRows = $('table.auctioncategories tbody').first().children('tr');

		// iterate over rows and pull out available data
	if (itemRows.length < 1) {
		console.log("no items found");
		res.status(204).send({ error: "looks like this isn't a real page. I mean don't get me wrong. It's there, but there's no table on the page." });
	} else {
		console.log(itemRows.length + ' items found.');

		entities = new Entities();

		itemRows.each(function(i, el) {
			var auction = {};
			var itemTH = $(el).children('th');
			var itemTD = $(el).children('td');
			var itemDIV = $(el).children('td').children('div');
			auction.id = itemTH.eq(0).html().trim();
			console.log("item id: " + auction.id);
			auction.title = itemTD.eq(0).children('a').html();
			auction.title = auction.title.replace(/(\r\n|\n|\r)/gm," ");
			auction.title = auction.title.replace(/(~)/gim,"");
			auction.title = auction.title.replace(/(�)/gim," ");
			auction.title = entities.decode(auction.title);
			console.log("item title: " + auction.title);
			auction.url = itemTD.eq(0).children('a').attr('href');
			console.log("item url: " + auction.url);
			auction.thumbnail = itemDIV.eq(0).children('img').attr('src');
			auction.img = auction.thumbnail.replace("-thumb","");
			console.log("item image: " + auction.img);
			auction.price = itemTD.eq(1).find('b').html();
			auction.price = auction.price.replace("$","");
			console.log("item price: " + auction.price);
			auction.bids = itemTD.eq(2).html();
			console.log("item bids: " + auction.bids);
			auction.views = itemTD.eq(3).html();
			console.log("item views: " + auction.views);
			auction.end = itemTD.eq(4).html();
			auction.end = moment(auction.end, 'M/D/YYYY h:m:s a').fromNow();
			console.log("item end: " + auction.end);
			auctionsArray.push(auction);
			if(itemRows.length === i+1) {
				console.log("sending JSON");
				sendJSON();
			};
		}); // end itemRows.each
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
		res.jsonp(auctionsArray);
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
