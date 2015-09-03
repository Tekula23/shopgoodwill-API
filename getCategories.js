var cheerio 		= require('cheerio');
var request			= require('request');
var url 				= require('url');
var tidy 				= require('htmltidy').tidy;
var Entities 		= require('html-entities').AllHtmlEntities;
var searchUrl 	= "http://www.shopgoodwill.com/search/";
var ua 					= require('universal-analytics');
var visitor 		= ua(process.env.GA_UA, {https: true});

exports.listCategories = function(req, res){

	var page = 1;
	var queryCat = undefined;

	if(req.params.title) {
		queryCat = req.params.title;
	};

	if(req.query.title) {
		queryCat = req.query.title;
	};

	if(req.query.page) {
		page = req.query.page;
	};

	request(searchUrl, function(err, resp, body) {
		if(!err) {
			tidy(body, function(error, html){
				if(!error) {
					//Get top level categories
					if(page && !queryCat){
						getCategories(html, page);
					} else {
						//Get sub level categories
						getSubCategory(html, queryCat);
					}
				}
			});
		}
	});

	var getCategories = function(html, page){
		var categoriesArray = [];
		$ = cheerio.load(html);
		var catOptions = $('select#catid').children('option');

		entities = new Entities();

		var parentCat;
		catOptions.each(function(i, el){
			var catName = $(el).html();
			var catID = $(el).val();
			switch(page){
				case 1:
					if(catName !== 'All Categories'){
						if(catName.indexOf("&gt;") < 0){
							catName = catName.replace(/and/g,'&')
							catName = catName.replace(/\//g,' & ')
							categoriesArray.push({
								id : catID,
								title : entities.decode(catName),
								subCount: getSubCount(html, catName)
							});
							parentCat = catName;
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

	var cleanCategory = function(catName) {
		var tCat = catName.toLowerCase();
		tCat = tCat.replace(/&amp;/g,'');
		tCat = tCat.replace(/&gt;/g,'');
		tCat = tCat.replace(/&/g,'');
		tCat = tCat.replace(/\//g,'');
		tCat = tCat.replace(/ /g,'');
		return tCat;
	}

	var getSubCount = function(html, parentCategory){
		var total = 0;
		var catOptions = $('select#catid').children('option');
		catOptions.each(function(i, el){
			var catName = $(el).html();
			var catID = $(el).val();
			if(catName !== 'All Categories'){
				tCat = cleanCategory(catName);
				tPCat = cleanCategory(parentCategory);
				if(tCat.indexOf(tPCat) > -1 && catName !== parentCategory){
					total += 1;
				}
			}
		});
		return total;
	}

	var getSubCategory = function(html, parentCategory, level){
		var categoriesArray = [];
		var subCategoriesArray = [];
		$ = cheerio.load(html);
		var catOptions = $('select#catid').children('option');

		entities = new Entities();

		console.log("Finding subcategory items for > " + parentCategory);
		var parentCat;
		catOptions.each(function(i, el){
			var catName = $(el).html();
			var catID = $(el).val();
			if(catName !== 'All Categories'){
				tCat = cleanCategory(catName);
				tPCat = cleanCategory(parentCategory);
				// console.log(tCat + " --> " + tPCat);
				if(tCat.indexOf(tPCat) > -1 && tCat !== tPCat){
					//if(tCat && tCat.length > 0){
						subCategoriesArray.push({
							id : catID,
							title : entities.decode(catName),
							parent: parentCategory
						});
					//}
				}
			}
		});

		res.jsonp(subCategoriesArray);
	};
};
