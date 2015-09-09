var cheerio 			= require('cheerio');
var request 			= require('request');
var url 					= require('url');
var tidy 					= require('htmltidy').tidy;
var Entities 			= require('html-entities').AllHtmlEntities;
var searchUrl 		= "http://www.shopgoodwill.com/";
var changeCase 		= require('change-case');
var ua 						= require('universal-analytics');

exports.listFeatured = function(req, res){

	var visitor	= ua(process.env.GA_UA);

	request(searchUrl, function(err, resp, body) {
		if(!err) {
			tidy(body, function(error, html){
				if(!error) {
					//Get featured items in list
					getFeatured(html);
				}
			});
		}
	});

	var getFeatured = function(html){
		var featuredItemsArray = [];
		$ = cheerio.load(html);
		var featuredItems = $('.homerightbox ul.dottedlist').children('li');

		entities = new Entities();

		featuredItems.each(function(i, el){
			var item = {};
			item.title = $(el).children('a').children('span').first().text().trim();
			console.log(item.title);
			item.title = item.title.replace(/(\r\n|\n|\r)/gm," ");
			item.title = item.title.replace(/(~)/gim,"");
			item.title = item.title.replace(/(�)/gim," ");
			item.title = changeCase.titleCase(item.title);
			item.title = updateSizes(item.title);
			console.log(item.title);
			item.url = $(el).children('a').attr('href');
			item.url = item.url.replace(/\/auctions\//gi,'').trim();
			console.log(item.url);
			item.id = item.url.replace(/.*-([0-9]*)?\.html/gim,'$1');
			console.log(item.id);
			featuredItemsArray.push(item);
		});

		res.jsonp(featuredItemsArray);
	};

	/**
   * Helper to change clothes sizes toUpperCase that were changed via change-case.
   * @param str
   */
  var updateSizes = function(str){
    return str.replace(/(XXL|XL|LRG|XXXL|SML|MED|NWT)/gi, function(a, l) { return l.toUpperCase(); });
  };

	var cleanItem = function(itemName) {
		var tCat = itemName.toLowerCase();
		tCat = tCat.replace(/&amp;/g,'');
		tCat = tCat.replace(/&gt;/g,'');
		tCat = tCat.replace(/&/g,'');
		tCat = tCat.replace(/\//g,'');
		tCat = tCat.replace(/ /g,'');
		return tCat;
	}

};
