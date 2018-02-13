const _ = require("underscore");
const UserModel = require("../models/user");

let Access =
{
	getUser: function(req, res, callback)
	{
		if (!res.locals.loggedIn)
			return callback({errmsg: "Not logged in!"}, undefined);
		UserModel.getBySessionToken(req.cookies.token, function(err, user) {
			if (!user)
				return callback({errmsg: "Not logged in!"}, undefined);
			return callback(null, user);
		});
	},

	// Before loading sensible content, check + save credentials
	logged: function(req, res, next)
	{
		Access.getUser(req, res, (err,user) => {
			if (!!err)
				return res.json(err);
			req.user = user;
			next();
		});
	},

	// Prevent access to "anonymous pages"
	unlogged: function(req, res, next)
	{
		if (!!req.user)
			return res.json({errmsg: "Already logged in!"});
		next();
	},

	// Prevent direct access to AJAX results
	ajax: function(req, res, next)
	{
		if (!req.xhr)
			return res.json({errmsg: "Unauthorized access"});
		next();
	},

	// Check for errors before callback (continue page loading). TODO: better name.
	checkRequest: function(res, err, out, msg, cb)
	{
		if (!!err)
			return res.json(err);
		if (!out || _.isEmpty(out))
			return res.json({errmsg: msg});
		cb();
	},
};

module.exports = Access;
