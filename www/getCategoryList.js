var cheerio 		= require('cheerio');
var request			= require('request');
var url 				= require('url');
var tidy 				= require('htmltidy').tidy;
var searchUrl 	= "http://www.shopgoodwill.com/search/";
var ua 					= require('universal-analytics');
var _						= require('lodash');
var fs 					= require('fs');
var tools				= require('./tools');

exports.listCategories = function(req, res){

	var page = 1;
	var queryCat, catList;
	var visitor 		= ua(process.env.GA_UA);

	if(req.params.catId) {
		queryCat = req.params.catId;
	}

	if(req.query.catId) {
		queryCat = req.query.catId;
	}

	if(req.query.page) {
		page = req.query.page;
	}


 /**
 * getSubCategory
 * @param catId: integer - The category id
 * @return json
 */
	var getSubCategory = function(catId){
		catId = parseInt(catId);
		var catFile = loadCategoryFile('json/categories.json');
		var catData;
		_.forEach(catFile, function(cat, i){
			if(cat.id === catId){
				catData = cat.subcategory;
				return;
			}
		});
		//Seach deeper
		if(typeof catData === 'undefined'){
			_.forEach(catFile, function(cat, i){
				_.forEach(cat.subcategory, function(cat2, j){
					if(cat2.id === catId){
						catData = cat2.subcategory;
						return;
					}
					if(typeof cat2.subcategory !== 'undefined'){
						_.forEach(cat2.subcategory, function(cat3, b){
							if(cat3.id === catId){
								catData = cat3.subcategory;
								return;
							}
							if(typeof cat3.subcategory !== 'undefined'){
								_.forEach(cat3.subcategory, function(cat4, d){
									if(cat4.id === catId){
										catData = cat4.subcategory;
										return;
									}
								});
							}
						});
					}
				});
			});
		}
		return catData;
	};

	/**
	 * DEPRECATED
	 * getCategories
	 * Action that retrieves the initial list of categories.
	 * @param html
	 * @param page
	 * @return
	 */
	// var getCategories = function(html, page){
	// 	var categoriesArray = [];
	// 	$ = cheerio.load(html);
	// 	var catOptions = $('select#catid').children('option');
	//
	// 	//Build the parsable category list
	// 	// var parsedCatList = buildCategoryList(catOptions);
	// 	var categories = {};
	// 	var parsedCatList = buildCategoryArray(catOptions, categories);
	//
	// 	res.jsonp(parsedCatList);
	// };

	/**
	 * readJsonFileSync
	 * @param filepath: string
	 * @param encoding: string
	 * @return json
	 */
	var readJsonFileSync = function(filepath, encoding) {
		if(typeof (encoding) == 'undefined'){
			encoding = 'utf8';
		}
		var file = fs.readFileSync(filepath, encoding);
		return JSON.parse(file);
	};

	/**
	 * loadCategoryFile
	 * @param file: string
	 */
	var loadCategoryFile = function(file){
		//Grab the categories.json file
		var categoryList = readJsonFileSync(__dirname + '/' + file);
		if(typeof categoryList !== 'undefined'){
			return categoryList;
		} else {
			return { error: "There was an error loading the categories list." };
		}
	};

	if(typeof queryCat === 'undefined'){
		//Load the categories
		catList = loadCategoryFile('json/categories.json');
	} else {
		catList = getSubCategory(queryCat);
	}

	res.jsonp(catList);

};
