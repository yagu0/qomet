const db = require("../utils/database");

const UserEntity =
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
				}}
			},
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
}

module.exports = UserEntity;
