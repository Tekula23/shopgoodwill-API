var express	= require('express');
var path		= require('path');
var port		= process.env.PORT || 5000;
var os			= require('os');
var ua 			= require('universal-analytics');
var nr 			= require('newrelic');
var socket 	= require('socket.io');
var visitor = ua(process.env.GA_UA);
var iconv 	= require('iconv-lite');
// store session state in browser cookie
// var cookieSession = require('cookie-session');

var encoding = 'utf-8';//'windows-1252';

var app	= express();

// app.use(cookieSession({
//   keys: ['ASPSESSIONIDQCASQDCT', 'CookieTest', '__qca', '__utma', '__utmc', '__utmz']
// }));

app.listen(port, function() {
	console.log("Listening on " + port);
});

app.all("/*", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
	res.header("Content-Type", "application/json; charset=" + encoding);
	visitor.pageview(req.originalUrl).send();
	// console.log("--- UA: Visitor ---");
	// console.log(visitor.debug());
	return next();
});

var auth  					= require('./www/auth.js');
var getHot  				= require('./www/getHot.js');
var getSellers			= require('./www/getSellers.js');
var getCategories		= require('./www/getCategories.js');
var getCategoryList	= require('./www/getCategoryList.js');
var getEndingToday	= require('./www/getEndingToday.js');
// var getNewTodayList	= require('./www/getNewToday.js');
var getFeatured			= require('./www/getFeatured.js');
var getAuctions			= require('./www/getAuctions.js');
var getAuction			= require('./www/getAuction.js');
var getGallery			= require('./www/getAuctionGallery.js');
var search					= require('./www/search.js');
var getFavorites		= require('./www/getFavorites.js');

app.get('/login', auth.doLogin);
app.get('/hot', getHot.listHotAuctions);
app.get('/categories', getCategories.listCategories);
app.get('/ending', getEndingToday.listAuctions);
app.get('/list', getCategoryList.listCategories);
// app.get('/new-list', getNewTodayList.listAuctions);
app.get('/featured', getFeatured.listFeatured);
app.get('/sellers', getSellers.listSellers);
app.get('/auction', getAuction.viewAuction);
app.get('/gallery', getGallery.viewItem);
app.get('/auctions', getAuctions.listAuctions);
app.get('/favorites', getFavorites.listFavorites);
app.get('/search', search.listAuctions);
