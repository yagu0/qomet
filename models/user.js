const params = require("../config/parameters");
const db = require("../utils/database");

const UserModel =
{
	/*
	 * Structure:
	 *   _id: BSON id
	 *   ** Strings, identification informations:
	 *   email
	 *   name
	 *   initials : computed, Benjamin Auder --> ba ...etc
	 *   loginToken: {
	 *     value: string
	 *     timestamp: datetime (validity)
	 *     ip: address of requesting machine
	 *   }
	 *   sessionTokens (array): cookie identification
	 */

	// BASIC FUNCTIONS
	//////////////////

	getInitialsByPrefix: function(prefix, cb)
	{
		db.users.find(
			{ initials: new RegExp("^" + prefix) },
			{ initials: 1, _id: 0 },
			cb
		);
	},

	insert: function(newUser, cb)
	{
		db.users.insert(Object.assign({},
			newUser,
			{
				loginToken: { },
				sessionTokens: [ ],
			}),
			cb
		);
	},

	getByLoginToken: function(token, cb)
	{
		db.users.findOne(
			{ "loginToken.value": token },
			cb
		);
	},

	getBySessionToken: function(token, cb)
	{
		db.users.findOne(
			{ sessionTokens: token},
			cb
		);
	},

	getById: function(uid, cb)
	{
		db.users.findOne(
			{ _id: uid },
			cb
		);
	},

	getByEmail: function(email, cb)
	{
		db.users.findOne(
			{ email: email },
			cb
		);
	},

	getByInitials: function(initials, cb)
	{
		db.users.findOne(
			{ initials: initials },
			cb
		);
	},

	getUnlogged: function(cb)
	{
		var tsNow = new Date().getTime();
		// 86400000 = 24 hours in milliseconds
		var day = 86400000;
		db.users.find({}, (err,userArray) => {
			let unlogged = userArray.filter( u => {
				return u.sessionTokens.length==0 && u._id.getTimestamp().getTime() + day < tsNow;
			});
			cb(err, unlogged);
		});
	},

	getAll: function(cb)
	{
		db.users.find({}, cb);
	},

	setLoginToken: function(token, uid, ip, cb)
	{
		db.users.update(
			{ _id: uid },
			{ $set: { loginToken: {
				value: token,
				timestamp: new Date().getTime(),
				ip: ip,
			} } },
			cb
		);
	},

	setSessionToken: function(token, uid, cb)
	{
		// Also empty the login token to invalidate future attempts
		db.users.update(
			{ _id: uid },
			{
				$set: { loginToken: {} },
				$push: { sessionTokens: {
					$each: [token],
					$slice: -7 //only allow 7 simultaneous connections per user (TODO?)
				}}
			},
			cb
		);
	},

	removeToken: function(uid, token, cb)
	{
		db.users.update(
			{ _id: uid },
			{ $pull: {sessionTokens: token} },
			cb
		);
	},

	// TODO: later, allow account removal
	remove: function(uids)
	{
		db.users.remove({_id: uids});
	},

	/////////////////////
	// ADVANCED FUNCTIONS

	create: function(newUser, callback)
	{
		// Determine initials from name parts
		let nameParts = newUser.name.split(/[ -]+/);
		let initials = nameParts.map( n => { return n.charAt(0).toLowerCase(); }).join("");
		// First retrieve all users with similar prefix initials
		UserModel.getInitialsByPrefix(initials, (err,userArray) => {
			if (!!userArray && userArray.length == 1)
				initials = initials + "2"; //thus number == users count for this hash
			else if (!!userArray && userArray.length > 1)
			{
				// Pick the highest number after initials (if any), and increment
				let numbers = userArray.map( u => {
					let digitMatch = u.initials.match(/[0-9]/);
					if (!digitMatch)
						return 1; //irrelevant
					let firstDigit = digitMatch.index;
					return parseInt(u.initials.slice(digitMatch.index));
				});
				initials = initials + (Math.max(...numbers)+1);
			}
			Object.assign(newUser, {initials: initials});
			UserModel.insert(newUser, callback);
		});
	},

	whitelistCheck: function(email)
	{
		if (params.whitelist.length == 0)
			return true; //no whitelist, everyone allowed
		for (let w of params.whitelist)
		{
			if ((w.indexOf('@') >= 0 && w==email) || !!email.match(new RegExp(w+"$")))
				return true;
		}
		return false;
	},

	cleanUsersDb: function()
	{
		UserModel.getUnlogged( (err,unlogged) => {
			UserModel.remove(unlogged);
		});
	},
}

module.exports = UserModel;
