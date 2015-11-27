var express	= require('express');
var path		= require('path');
var app			= express();
var port		= process.env.PORT || 5000;
var os			= require('os');
var ua 			= require('universal-analytics');
var nr 			= require('newrelic');
var socket 	= require('socket.io');
var visitor = ua(process.env.GA_UA);

app.listen(port, function() {
	console.log("Listening on " + port);
});

app.all("/*", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
	visitor.pageview(req.originalUrl).send();
	// console.log("--- UA: Visitor ---");
	// console.log(visitor.debug());
	return next();
});

var getHot  				= require('./routes/getHot.js');
var getSellers			= require('./routes/getSellers.js');
var getCategories		= require('./routes/getCategories.js');
var getCategoryList	= require('./routes/getCategoryList.js');
var getFeatured			= require('./routes/getFeatured.js');
var getAuctions			= require('./routes/getAuctions.js');
var getAuction			= require('./routes/getAuction.js');
var getGallery			= require('./routes/getAuctionGallery.js');
var search					= require('./routes/search.js');
var getFavorites		= require('./routes/getFavorites.js');

app.get('/hot', getHot.listHotAuctions);
app.get('/categories', getCategories.listCategories);
app.get('/list', getCategoryList.listCategories);
app.get('/featured', getFeatured.listFeatured);
app.get('/sellers', getSellers.listSellers);
app.get('/auction', getAuction.viewAuction);
app.get('/gallery', getGallery.viewItem);
app.get('/auctions', getAuctions.listAuctions);
app.get('/favorites', getFavorites.listFavorites);
app.get('/search', search.listAuctions);
