var cheerio 		= require('cheerio');
var request			= require('request');
var url 				= require('url');
var tidy 				= require('htmltidy').tidy;
var Entities 		= require('html-entities').AllHtmlEntities;
var searchUrl 	= "http://www.shopgoodwill.com/search/";
var ua 					= require('universal-analytics');
var _						= require('lodash');


exports.listCategories = function(req, res){

	var page = 1;
	var queryCat = undefined;
	var visitor = ua(process.env.GA_UA);

	if(req.params.catId) {
		queryCat = req.params.catId;
	};

	if(req.query.catId) {
		queryCat = req.query.catId;
	};

	if(req.query.page) {
		page = req.query.page;
	};

	/**
	 * request
	 */
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

	/**
	 * getCategories
	 * Action that retrieves the initial list of categories.
	 * @param html
	 * @param page
	 * @return
	 */
	var getCategories = function(html, page){
		var categoriesArray = [];
		$ = cheerio.load(html);
		var catOptions = $('select#catid').children('option');

		//Build the parsable category list
		var parsedCatList = buildCategoryList(catOptions);
		console.log(parsedCatList);

		var parentCat;
		catOptions.each(function(i, el){
			var catName = $(el).html();
			catName = basicTitleClean(catName);
			var catID = parseInt($(el).val());
			switch(page){
				case 1:
					if(catName !== 'All Categories'){
						//Only pull items that do not include a < symbol
						if(catName.indexOf(">") < 0){
							categoriesArray.push({
								id : catID,
								title : catName,
								subCount: getSubCount(html, catName)
							});
							parentCat = catName;
						}
					}
					break;
				default:
					categoriesArray.push({
						id : catID,
						title : catName
					});
					break;
			}
		});

		res.jsonp(categoriesArray);
	};

	/**
	 * basicTitleClean
	 * Handles decoding the entities in the title along with some basic clean up
	 * @param str
	 * @return str
	 */
	var basicTitleClean = function(str){
		var entities = new Entities();
		str = entities.decode(str);
		str = str.replace(/and/g,'&');
		str = str.replace(/\//g,' & ');
		str = str.replace(/\n|\r|\n\r/g,' '); //Convert new lines to spaces
		return str;
	}

	/**
	 * cleanCategory
	 * Action to help clean category titles.
	 */
	var cleanCategory = function(catName) {
		var tCat = catName.toLowerCase();
		tCat = tCat.replace(/&amp;/g,'');
		tCat = tCat.replace(/&gt;/g,'');
		tCat = tCat.replace(/&/g,'');
		tCat = tCat.replace(/\//g,'');
		tCat = tCat.replace(/ /g,'');
		return tCat;
	}

	/**
	 * getSubCount
	 * Action that retrieves the number of subcategories a category has.
	 */
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
	};

	/**
	 * buildCategoryList
	 * Helper to build a proper parsable category list.
	 * Example: Array of objects (catID as target attr)
	 * {
	 * 	"15": [
	 * 		{
	 * 			"id": "70",
	 *			"name": "Art &gt; Drawings"
	 * 		},
	 * 		{
	 * 			"id": "368",
	 *			"name": "Art &gt; Indigenous Art"
	 * 		}
	 * 	]
	 * }
	 */
	var buildCategoryList = function(optionList){
		var catList = [];
		var tCatName = "";
		var ptCatName = "";
		var tCatID = "";
		var ptCatID = "";
		var tTracker = [];
		optionList.each(function(i, el) {
			tCatName = $(el).html();
			tCatName = basicTitleClean(tCatName);
			tCatID = parseInt($(el).val());
			console.log("id: " + tCatID);
			console.log("name: " + tCatName);
			if(tCatName !== 'All Categories'){
				tTracker = tCatName.split('>');
				if(typeof tTracker !== 'undefined' && tTracker.length > 1){
					console.log(tTracker);
					_.forEach(tTracker, function(j, cat){
						if(typeof tTracker[j] !== 'undefined'){
							tCatName = tTracker[j].trim();
							//TODO: Figure out how to build a three level array
							//[Main Cats][Secondary Cats][Third Set of Categories]
							//Something > Else > Here
							catList[i].push({
								id: null,
								name: tCatName
							});
						}
					});
				}
			}

			//Found a new category name
			// if(i < 1 || tCatName !== ptCatName){
			// 	tCatName = $(el).html();
			// 	tCatName = basicTitleClean(tCatName);
			// 	tCatID = parseInt($(el).val());
			// 	if(typeof catList[parseInt(tCatID)] === 'undefined' && tCatID > 0){
			// 		catList[tCatID] = {
			// 			id: tCatID,
			// 			name: tCatName
			// 		}
			// 	} else {
			// 		// catList[tCatID] = {
			// 		// 	id: tCatID,
			// 		// 	name: tCatName
			// 		// }
			// 	}
			// } else {
			// 	//Didn't find the category name in the prev temp name.
			// }
			//
			// //Try to break the categories by a > first
			// tTracker = tCatName.split('>');
			// console.log(tTracker);
			// if(typeof tTracker[0] !== 'undefined'){
			// 	ptCatName = tTracker[0].trim();
			// } else {
			// 	ptCatName = tCatName.trim();
			// }
			//
			// console.log("ptCatName: " + ptCatName);
			// console.log("tTracker: " + tTracker);
		});
		return catList;
	};

	/**
	 * getSubCategory
	 * Action to build and retrieve subcategory lists.
	 */
	var getSubCategory = function(html, parentCategoryId, level){
		var categoriesArray = [];
		var subCategoriesArray = [];
		$ = cheerio.load(html);
		var catOptions = $('select#catid').children('option');

		catOptions.each(function(i, el){
			var catName = $(el).html();
			catName = basicTitleClean(catName);
			var catID = $(el).val();
			if(parseInt(catID) === parseInt(parentCategoryId)){
				console.log("--- Subcategory ID:" + catID + ' ---');
				console.log("--- Subcategory Name:" + catName + ' ---');

				// tPCat = cleanCategory(parentCategoryId);
				// console.log(tCat + " --> " + tPCat);
				// if(tCat.indexOf(tPCat) > -1 && tCat !== tPCat){
					//if(tCat && tCat.length > 0){
						subCategoriesArray.push({
							id : catID,
							title : catName,
							parent: parentCategoryId
						});
					//}
				// }
			}
		});

		res.jsonp(subCategoriesArray);
	};
};
