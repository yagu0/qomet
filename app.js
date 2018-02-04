const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');
const params = require(path.join(__dirname, "config", "parameters"));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, "public", "favicon", "favicon.ico")));
if (app.get('env') === 'development')
{
	// Full logging in development mode
	app.use(logger('dev'));
}
else
{
	app.set('trust proxy', true); //http://dev.rdybarra.com/2016/06/23/Production-Logging-With-Morgan-In-Express/
	// In prod, only log error responses (https://github.com/expressjs/morgan)
	app.use(logger('combined', {
		skip: function (req, res) { return res.statusCode < 400 }
	}));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Before any request, check cookies
app.use(function(req, res, next) {
	res.locals.loggedIn = !!req.cookies.token;
	res.locals.myInitials = req.cookies.initials; //may be undefined
	next();
});

// Routing
let routes = require(path.join(__dirname, "routes", "all"));
app.use("/", routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development (TODO: difference req.app and app ?!)
	res.locals.message = err.message;
	if (app.get('env') === 'development')
		console.log(err);
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
