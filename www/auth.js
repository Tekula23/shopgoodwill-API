var request      = require('request');
var cheerio   	 = require('cheerio');
var tidy         = require('htmltidy').tidy;
var destination  = "https://www.shopgoodwill.com";
var getUrl   	 	 = destination + "/buyers/default.asp";
var loginAction  = "dologin.asp";
var postUrl 		 = destination + "/buyers/" + loginAction;
var ua 				   = require('universal-analytics');
var util 				 = require('util');
var Cookies 		 = require('cookies');

exports.doLogin = function(req, res){

	var $ = {};
	var headerCookieValues = [];
	var usernameField = '';
	var passwordField = '';

	if (req.method.toLowerCase() == 'get') {
		displayForm(req, res);
	} else if (req.method.toLowerCase() == 'post') {
		processAllFieldsOfTheForm(req, res);
	}


	var tidyPage = function(resp) {
		var body = resp.body;
    // console.log("Cleaning Markup");
    tidy(body, function(err, html) {
      if(err) {
        console.error(err);
        res.jsonp(err);
				res.end();
      } else {
        $ = cheerio.load(html);
				var forms = $('form');
				var loginInputFields = processAllFieldsOfTheForm(forms);
				// res.jsonp(loginInputFields);
				handleLogin(loginInputFields, resp);
      }
    });
  };

	function displayForm(req, res) {
		console.log('Inside of displayForm.');
		//Send the intial request to grab cookie data
		request
			.get(
				getUrl,
				function(err, resp) {
					if(err) {
						res.jsonp(err);
						res.end();
					} else {
						// headerCookieValues.push({
						// 	key: 'Set-Cookie',
						// 	value: resp['set-cookie'][0]
						// });
						// headerCookieValues.push({
						// 	key: 'Set-Cookie',
						// 	value: resp['set-cookie'][1]
						// });
						//
						// console.log(headerCookieValues);
						//Grab the cookie values from the Header
						tidyPage(resp);
					}
				}
			);
	}

	function processAllFieldsOfTheForm(forms) {
		var loginInputFields = [];
		for( var i1 = 0, l1 = forms.length; i1 < l1; i1 ++ ){
			var form = forms[ i1 ];
			inputFields = $( 'input', form );

			//Find the login form
			if(form.attribs.action){
				if(loginAction.toString() === form.attribs.action.toString()){
					// console.log("******FORM ACTION: \n\r", form.attribs.action );
					// console.log("******FORM: \n\r", form );

					for( var i2 = 0, l2 = inputFields.length; i2 < l2; i2 ++ ){
						var inputField = inputFields[ i2 ];
						// console.log(inputField.attribs);
						loginInputFields.push(inputField.attribs);
						// console.log("**************INPUT FIELD \n\r", inputField );

						/* At this point, I have `action` and every input field */
					}
				}
			}
		}

		//Fill in the user info and then pass the form off to the server
		var formData = {};
		//username
		usernameField = loginInputFields[0].name;
		formData[loginInputFields[0].name] = 'robksawyer';
		//password
		passwordField = loginInputFields[0].name;
		formData[loginInputFields[1].name] = '711isgr8';
		for(var h1 = 0; h1 < loginInputFields.length; h1++){
			//Find the hidden values
			if(loginInputFields[h1].type === 'hidden'){
				formData[loginInputFields[h1].name] = loginInputFields[h1].value;
			}
		}
		return formData;
	}

	function handleLogin (formData, resp){

		var cookieObjs = [
			{
				key: 'ASPSESSIONIDQCASQDCT',
				value: ''
			},
			{
				key:'CookieTest',
				value: 'ishere',
			},
			{
				key: '__qca',
				value: 'P0-379860961-1449043255309'
			},
			{
				key: '__utma',
				value: '212002006.1185600938.1449043255.1449043255.1449043255.1'
			},
			{
				key: '__utmb',
				value: '212002006.1.10.1449043255'
			},
			{
				key: '__utmc',
				value: '212002006'
			},
			{
				key: '__utmt',
				value: '1'
			},
			{
				key: '__utmz',
				value: '212002006.1449043255.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)'
			}
		];
		var cookieKeys = [];
		for(var o in cookieObjs) {
			cookieKeys.push(cookieObjs[o].key);
		}
		console.log(cookieKeys);
		console.log(resp);
		if(resp.caseless.dict){
			var tempCookieVals = resp.caseless.dict['set-cookie'][1].split("=");
			var goodCookie = {
				key: tempCookieVals[0],
				secret: tempCookieVals[1].replace("; path", "")
			};
		}
		console.log(goodCookie);
		console.log(formData);
		var cookies = new Cookies( req, res, cookieKeys );
		cookies
			// set a regular cookie
			.set( goodCookie.key, goodCookie.secret, { httpOnly: true } )
			.set( cookieObjs[1].key, cookieObjs[1].value , { httpOnly: true } )
			.set( cookieObjs[2].key, cookieObjs[2].value , { httpOnly: false } )
			.set( cookieObjs[3].key, cookieObjs[3].value , { httpOnly: false } )
			.set( cookieObjs[4].key, cookieObjs[4].value , { httpOnly: false } )
			.set( cookieObjs[5].key, cookieObjs[5].value , { httpOnly: false } )
			.set( cookieObjs[6].key, cookieObjs[6].value , { httpOnly: false } )
			.set( cookieObjs[7].key, cookieObjs[7].value , { httpOnly: false } );

		request
			.post(
				{
					url: postUrl,
					form: formData
				},
				function(err, resp, body){
					console.log(resp);
					console.log(body);
					if(err){
						res.jsonp(err);
						res.end();
					} else {
						console.log(resp);
						res.jsonp(resp);
						res.end();
					}
				}
			);

		// var request = request.defaults({ jar: true });
		//headerCookieValues
		// request
		// 	.post(postUrl)
		// 	.send(formData)
		// 	.end(
		// 		function(err, response){
		// 			if(err){
		// 				// Calling the end function will send the request
		// 				res.jsonp(err);
		// 				res.end();
		// 			} else {
		//
		//
		// 				// var cookies = new Cookies( req, res, cookieKeys );
		//
		// 				// cookies
		// 				// 	// set a regular cookie
		// 				// 	.set( goodCookie.key, goodCookie.secret, { httpOnly: true } )
		// 				// 	.set( cookieObjs[1].key, cookieObjs[1].value , { httpOnly: true } )
		// 				// 	.set( cookieObjs[2].key, cookieObjs[2].value , { httpOnly: false } )
		// 				// 	.set( cookieObjs[3].key, cookieObjs[3].value , { httpOnly: false } )
		// 				// 	.set( cookieObjs[4].key, cookieObjs[4].value , { httpOnly: false } )
		// 				// 	.set( cookieObjs[5].key, cookieObjs[5].value , { httpOnly: false } )
		// 				// 	.set( cookieObjs[6].key, cookieObjs[6].value , { httpOnly: false } )
		// 				// 	.set( cookieObjs[7].key, cookieObjs[7].value , { httpOnly: false } );
		//
		// 					// set a signed cookie
		// 					// .set( "signed", "bar", { signed: true } )
		//
		// 				// res.writeHead( 200, { "Content-Type": "text/plain" } );
		// 				console.log(cookies.keys.index());
		// 				res.jsonp(response);
		// 				res.end();
		//
		//
		// 				// res.jsonp(response);
		// 				// res.end();
		// 			}
		//
		// 		}
		// 	);
	}

	//Scrape the page and pull the form elements

};
