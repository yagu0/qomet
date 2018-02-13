let router = require("express").Router();
const validator = require('../public/javascripts/utils/validation');
const UserModel = require('../models/user');
const maild = require('../utils/mailer');
const TokenGen = require("../utils/tokenGenerator");
const access = require("../utils/access");
const params = require("../config/parameters");

// to: object user
function sendLoginToken(subject, to, res)
{
	// Set login token and send welcome(back) email with auth link
	let token = TokenGen.generate(params.token.length);
	UserModel.setLoginToken(token, to._id, to.ip, (err,ret) => {
		access.checkRequest(res, err, ret, "Cannot set login token", () => {
			maild.send({
				from: params.mail.from,
				to: to.email,
				subject: subject,
				body: "Hello " + to.initials + "!\n" +
					"Access your account here: " +
					params.siteURL + "/authenticate?token=" + token + "\\n" +
					"Token will expire in " + params.token.expire/(1000*60) + " minutes."
			}, err => {
				res.json(err || {});
			});
		});
	});
}

router.get('/register', access.ajax, access.unlogged, (req,res) => {
	let email = decodeURIComponent(req.query.email);
	let name = decodeURIComponent(req.query.name);
	const newUser = {
		email: email,
		name: name,
	};
	let error = validator(newUser, "User");
	if (error.length > 0)
		return res.json({errmsg:error});
	if (!UserModel.whitelistCheck(newUser.email))
		return res.json({errmsg: "Email not in whitelist"});
	UserModel.getByEmail(newUser.email, (err,user0) => {
		access.checkRequest(res, err, !user0?["ok"]:{}, "An account exists with this email", () => {
			UserModel.create(newUser, (err,user) => {
				access.checkRequest(res, err, user, "Registration failed", () => {
					user.ip = req.ip;
					sendLoginToken("Welcome to " + params.siteURL, user, res);
				});
			});
		});
	});
});

// Login:
router.get('/sendtoken', access.ajax, access.unlogged, (req,res) => {
	let email = decodeURIComponent(req.query.email);
	let error = validator({email:email}, "User");
	if (error.length > 0)
		return res.json({errmsg:error});
	UserModel.getByEmail(email, (err,user) => {
		access.checkRequest(res, err, user, "Unknown user", () => {
			user.ip = req.ip;
			sendLoginToken("Token for " + params.siteURL, user, res);
		});
	});
});

// Authentication process, optionally with email changing:
router.get('/authenticate', access.unlogged, (req,res) => {
	let loginToken = req.query.token;
	let error = validator({token:loginToken}, "User");
	if (error.length > 0)
		return res.json({errmsg:error});
	UserModel.getByLoginToken(loginToken, (err,user) => {
		access.checkRequest(res, err, user, "Invalid token", () => {
			if (user.loginToken.ip != req.ip)
				return res.json({errmsg: "IP address mismatch"});
			let now = new Date();
			let tsNow = now.getTime();
			// If token older than params.tokenExpire, do nothing
			if (user.loginToken.timestamp + params.token.expire < tsNow)
				return res.json({errmsg: "Token expired"});
			// Generate and update session token + destroy login token
			let token = TokenGen.generate(params.token.length);
			UserModel.setSessionToken(token, user._id, (err,ret) => {
				access.checkRequest(res, err, ret, "Authentication failed", () => {
					// Set cookies and redirect to user main control panel
					res.cookie("token", token, {
						httpOnly: true,
						maxAge: params.cookieExpire,
					});
					res.cookie("initials", user.initials, {
						httpOnly: true,
						maxAge: params.cookieExpire,
					});
					res.redirect("/" + user.initials);
				});
			});
		});
	});
});

router.get('/logout', access.logged, (req,res) => {
	UserModel.removeToken(req.user._id, req.cookies.token, (err,ret) => {
		access.checkRequest(res, err, ret, "Logout failed", () => {
			res.clearCookie("initials");
			res.clearCookie("token");
			res.redirect('/');
		});
	});
});

module.exports = router;
