var cheerio 			= require('cheerio');
var request 			= require('request');
var url 					= require('url');
var tidy 					= require('htmltidy').tidy;
var Entities 			= require('html-entities').AllHtmlEntities;
var searchUrl 		= "http://www.shopgoodwill.com/";
var changeCase 		= require('change-case');
var ua 						= require('universal-analytics');
var tools					= require('./tools');

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
			item.title = tools.cleanTitle(item.title);
			item.url = $(el).children('a').attr('href');
			item.url = item.url.replace(/\/auctions\//gi,'').trim();
			item.id = item.url.replace(/.*-([0-9]*)?\.html/gim,'$1');
			featuredItemsArray.push(item);
		});

		res.jsonp(featuredItemsArray);
	};

};
