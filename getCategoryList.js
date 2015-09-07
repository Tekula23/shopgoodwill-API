var cheerio 		= require('cheerio');
var request			= require('request');
var url 				= require('url');
var tidy 				= require('htmltidy').tidy;
var Entities 		= require('html-entities').AllHtmlEntities;
var searchUrl 	= "http://www.shopgoodwill.com/search/";
var ua 					= require('universal-analytics');
var _						= require('lodash');
var visitor 		= ua(process.env.GA_UA, {https: true});

exports.listCategories = function(req, res){

	var page = 1;
	var queryCat = undefined;

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
					getCategories(html, page);
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
		// var parsedCatList = buildCategoryList(catOptions);
		var catArray = [];
		var parsedCatList = buildCategoryArray(catOptions, catArray);

		// var parentCat;
		// catOptions.each(function(i, el){
		// 	var catName = $(el).html();
		// 	catName = basicTitleClean(catName);
		// 	var catID = parseInt($(el).val());
		// 	switch(page){
		// 		case 1:
		// 			if(catName !== 'All Categories'){
		// 				//Only pull items that do not include a < symbol
		// 				if(catName.indexOf(">") < 0){
		// 					categoriesArray.push({
		// 						id : catID,
		// 						title : catName,
		// 						subCount: getSubCount(html, catName)
		// 					});
		// 					parentCat = catName;
		// 				}
		// 			}
		// 			break;
		// 		default:
		// 			categoriesArray.push({
		// 				id : catID,
		// 				title : catName
		// 			});
		// 			break;
		// 	}
		// });

		res.jsonp(parsedCatList);
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
		tCat = tCat.trim();
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
		var counter = 0;
		var sCounter = 0;
		//
		optionList.each(function(i, el) {
			tCatName = $(el).html();
			tCatName = basicTitleClean(tCatName);
			tCatID = parseInt($(el).val());
			// console.log("id: " + tCatID);
			// console.log("name: " + tCatName);
			if(tCatName !== 'All Categories'){

				//Split the sub categories into an array
				//Note: The first element is going to be the top level element
				tTracker = tCatName.split('>');

				//When a new top level category is found, increment the counter
				if(typeof catList[counter] !== 'undefined' && tTracker.length < 2 && catList[counter].name !== tCatName){
					counter++;
				}

				//Push the top level category into an index
				if(typeof catList[counter] === 'undefined' && tTracker.length < 2){
					catList[counter] = {
							id: tCatID,
							name: tCatName,
							subcategories: []
						};
				}

				//Make sure the category has subcategories
				if(typeof tTracker !== 'undefined' && tTracker.length > 1){
					//Traverse the subcategory array
					_.forEach(tTracker, function(cat, j){
							//Don't pull the first element (That's the top level category.)
							if(typeof tTracker[1] !== 'undefined'){
								tCatName = tTracker[1].trim();
								var prevSubCatLength = catList[counter].subcategories.length - 1;
								if(typeof tCatName !== 'undefined' && typeof catList[counter].subcategories[prevSubCatLength] !== 'undefined' && catList[counter].subcategories[prevSubCatLength].name !== tCatName){
									catList[counter].subcategories.push({
										id: tCatID,
										name: tCatName,
										subcategories: []
									});
								} else if (typeof tCatName !== 'undefined' && typeof catList[counter].subcategories[prevSubCatLength] === 'undefined') {
									catList[counter].subcategories.push({
										id: tCatID,
										name: tCatName,
										subcategories: []
									});
								}
							}
					});

					//Traverse the subcategory 2 array
					_.forEach(catList[counter].subcategories, function(subcat, o){

						_.forEach(tTracker, function(cat, j){


								//Traverse the subcategory 3 array
								_.forEach(catList[counter].subcategories[o].subcategories, function(subcat2, w){
										//Don't pull the first element (That's the top level category.)
										if(typeof tTracker[3] !== 'undefined' && typeof catList[counter].subcategories[o].subcategories[w] !== 'undefined'){
											tCatName = tTracker[3].trim();

											console.log(tCatName);

											var prevSubCatLength = catList[counter].subcategories[o].subcategories[w].subcategories.length - 1;
											if(typeof tCatName !== 'undefined' && typeof catList[counter].subcategories[o].subcategories[w].subcategories[prevSubCatLength] !== 'undefined' && catList[counter].subcategories[o].subcategories[w].subcategories[prevSubCatLength].name !== tCatName){
												catList[counter].subcategories[o].subcategories[w].subcategories.push({
													id: tCatID,
													name: tCatName,
													subcategories: []
												});
											} else if (typeof tCatName !== 'undefined' && typeof catList[counter].subcategories[o].subcategories[w].subcategories[prevSubCatLength] === 'undefined') {
												catList[counter].subcategories[o].subcategories[w].subcategories.push({
													id: tCatID,
													name: tCatName,
													subcategories: []
												});
											}
										}
								});

						});



					});


				}
			}
		});
		return catList;
	};

	/**
	 * Build an array of the categories
	 * @param elements: object HTML Elements
	 * @param tArray: array
	 * @return array
	 */
	var buildCategoryArray = function(elements, tArray, categoryName, level, subCount){
		var tCatName, tCatID, tTracker;
		if(!level) level = 0;

		elements.each(function(i, el) {
			tCatName = $(el).html();
			tCatName = basicTitleClean(tCatName);
			tCatID = parseInt($(el).val());

			if(tCatName !== 'All Categories'){

				//Split the sub categories into an array
				//Note: The first element is going to be the top level element
				tTracker = tCatName.split('>');

				if(typeof tArray[level] === 'undefined' || tTracker[tTracker.length-1] !== tArray[level].name){
					tCatName = tTracker[tTracker.length-1];
					if(tTracker.length > 3){
						// tArray[tTracker.length - 3].push({
						// 			id: tCatID,
						// 			name: tCatName,
						// 			subcount: getSubCount(elements, tCatName)
						// 		});
						// console.log("-------> " + tCatName);
					} else if(tTracker.length > 2){
						// tArray[tTracker.length - 2].push({
						// 			id: tCatID,
						// 			name: tCatName,
						// 			subcount: getSubCount(elements, tCatName)
						// 		});
						// console.log("----> " + tCatName);
					} else if(tTracker.length > 1) {
						// console.log("--> " + tCatName);
						console.log(tTracker[0] + " === " + tArray[ tArray.length-1 ].name);

						if(tArray[ tArray.length-1 ].name.trim().toLowerCase() === tTracker[0].trim().toLowerCase()){
							console.log("HERE");
							console.log(tCatName);
							if(typeof tArray[ tArray.length-1 ].sub === 'undefined'){
								tArray[ tArray.length-1 ].sub = [];
							}
							tArray[ tArray.length-1 ].sub.push({
										id: tCatID,
										name: tCatName,
										subcount: getSubCount(elements, tCatName)
									});
							console.log(tArray[ tArray.length-1 ].sub);
						}
						//
						// if(tArray[tArray.length-1].subcount > 0){
						// 	//Get the subcategories and then return.
						// 	tArray[tArray.length-1].subcategories = [];
						// 	tArray[tArray.length-1].subcategories = buildCategoryArray(elements, tArray[tArray.length-1].subcategories, tCatName, level++, tArray[tArray.length-1].subcount);
						// }
					} else {
						// console.log("-> " + tCatName);
						if(typeof tCatID !== 'undefined'){
							tArray.push({
										id: tCatID,
										name: tCatName,
										subcount: getSubCount(elements, tCatName)
									});
						}
					}


				}
				// else if (typeof categoryName !== 'undefined'){
				// 	if(categoryName === tTracker[tTracker.length - 1]){
				// 		tCatName = tTracker[tTracker.length-1];
				// 		tArray.push({
				// 					id: tCatID,
				// 					name: tCatName,
				// 					subcount: getSubCount(elements, tCatName)
				// 				});
				//
				// 		if(tArray[tArray.length-1].subcount > 0){
				// 			//Get the subcategories and then return.
				// 			tArray.subcategories = [];
				// 			tArray.subcategories = buildCategoryArray(elements, tArray.subcategories, tCatName);
				// 		}
				// 	}
				// }

				// if(tArray[tCatName].subcount > 0){
				// 	_.forEach(tTracker, function(cat, j){
				// 			//Don't pull the first element (That's the top level category.)
				// 			if(typeof tTracker[j] !== 'undefined'){
				// 				tSubCatName = tTracker[j].trim();
				// 				tArray[tCatName] = [];
				// 				tArray[tCatName][tSubCatName] = {
				// 					id: tCatID,
				// 					name: tSubCatName
				// 				};
				// 			}
				// 	});
				// }

			}
		});
		return tArray;
	}


	var getSubcategories = function(){
		var subCatArray = [];
		//Don't pull the first element (That's the top level category.)
		if(typeof tTracker[2] !== 'undefined'){
			tCatName = tTracker[2].trim();
			var prevSubCatLength = catList[counter].subcategories[o].subcategories.length - 1;
			if(typeof tCatName !== 'undefined' && typeof catList[counter].subcategories[o].subcategories[prevSubCatLength] !== 'undefined' && catList[counter].subcategories[o].subcategories[prevSubCatLength].name !== tCatName){
				catList[counter].subcategories[o].subcategories.push({
					id: tCatID,
					name: tCatName,
					subcategories: []
				});
			} else if (typeof tCatName !== 'undefined' && typeof catList[counter].subcategories[o].subcategories[prevSubCatLength] === 'undefined') {
				catList[counter].subcategories[o].subcategories.push({
					id: tCatID,
					name: tCatName,
					subcategories: []
				});
			}
		}
		return subCatArray;
	}

};
