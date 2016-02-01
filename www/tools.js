var changeCase	= require('change-case');
var Entities 		= require('html-entities').AllHtmlEntities;

// tools.js
// ========
module.exports = {

	/**
	 * cleanTitle
	 * Handles cleaning up the auction titles
	 */
  cleanTitle: function (str) {
		var entities = new Entities();
		var title = str.replace(/(\r\n|\n|\r)/gm," ");
		title = title.replace(/(~)/gim,"");
		title = title.replace(/(�)/gim,"–");
		title = title.replace(/(ï¿½)/gim,"–");
		title = entities.decode(title);
		// title = changeCase.titleCase(title); //Messes up slashes
    title = updateSizes(title);
		return title;
  },

	/**
	 * basicTitleClean
	 * Handles decoding the entities in the title along with some basic clean up
	 * @param str
	 * @return str
	 */
	basicTitleClean: function(str){
		var entities = new Entities();
		str = entities.decode(str);
		str = str.replace(/and/g,'&');
		str = str.replace(/\//g,' & ');
		str = str.replace(/\n|\r|\n\r/g,' '); //Convert new lines to spaces
		return str;
	},

	/**
	 * sanitize
	 * Helper method that sanitizes/converts the auction title to one used on shopgoodwill.com. See example below.
	 * ex. http://www.shopgoodwill.com/auctions/King-James-Version-Paperback-New-Testament-23794420.html
	 * @param str
	 */
	sanitize: function(str){
		str = str.replace(/[^\w-]/g, '-');
		return str;
	},

	/**
	 * cleanItem
	 */
	cleanItem: function(itemName) {
		var tCat = itemName.toLowerCase();
		tCat = tCat.replace(/&amp;/g,'&');
		tCat = tCat.replace(/&gt;/g,'');
		tCat = tCat.replace(/&/g,'');
		tCat = tCat.replace(/\//g,'');
		tCat = tCat.replace(/ /g,'');
		return tCat;
	},


	/**
	 * cleanCategory
	 * Action to help clean category titles.
	 */
	cleanCategory: function(catName) {
		var tCat = catName.toLowerCase();
		tCat = tCat.replace(/&amp;/g,'');
		tCat = tCat.replace(/&gt;/g,'');
		tCat = tCat.replace(/&/g,'');
		tCat = tCat.replace(/\//g,'');
		tCat = tCat.replace(/ /g,'');
		return tCat;
	}

};

/**
 * Helper to change clothes sizes toUpperCase that were changed via change-case.
 * @param str
 */
var updateSizes = function(str){
	return str.replace(/(\sXXL\s|\sXL\s|\sLRG\s|\sXXXL\s|\sSML\s|\sMED\s|\sNWT\s)/gi, function(a, l) { return l.toUpperCase(); });
};
