var cheerio = require('cheerio');
var request = require('request');
var tidy = require('htmltidy').tidy;
var Entities = require('html-entities').AllHtmlEntities;
var searchUrl = "http://www.shopgoodwill.com/search/";

exports.listCategories = function(req, res){

	var queryCatLevel = 0;

	if(req.query.level) {
		queryCatLevel = req.query.level;
	};

	request(searchUrl, function(err, resp, body) {
		if(!err) {
			tidy(body, function(error, html){
				if(!error) {
					getCategories(html, queryCatLevel);
				}
			});
		}
	});

	var categoriesArray = [];

	var getCategories = function(html, level){
		$ = cheerio.load(html);
		var catOptions = $('select#catid').children('option');

		entities = new Entities();

		catOptions.each(function(i, el){
			var catName = $(el).html();
			var catID = $(el).val();
			switch(level){
				case 0:
					if(catName !== 'All Categories'){
						if(catName.indexOf("&gt;") < 0){
							categoriesArray.push({
								id : catID,
								title : entities.decode(catName)
							});
						}
					}
					break;
				default:
					categoriesArray.push({
						id : catID,
						title : entities.decode(catName)
					});
					break;
			}
		});

		res.jsonp(categoriesArray);
	};
};
