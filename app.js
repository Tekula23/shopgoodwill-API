var express	= require('express');
var path		= require('path');
var app			= express();
var port		= process.env.PORT || 5000;
var os			= require('os');

app.listen(port, function() {
	console.log("Listening on " + port)
});

app.all("/*", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
	return next();
});

var getHot  			= require('./getHot.js');
var getSellers		= require('./getSellers.js');
var getCategories	= require('./getCategories.js');
var getAuctions		= require('./getAuctions.js');
var getAuction		= require('./getAuction.js');
var search				= require('./search.js');
var getFavorites	= require('./getFavorites.js');

app.get('/hot', getHot.listHotAuctions);
app.get('/categories', getCategories.listCategories);
app.get('/sellers', getSellers.listSellers);
app.get('/auction', getAuction.viewAuction);
app.get('/auctions', getAuctions.listAuctions);
app.get('/favorites', getFavorites.listFavorites);
app.get('/search', search.listAuctions);
