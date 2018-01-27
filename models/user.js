const UserEntity = require("../entities/user");
const params = require("../config/parameters");

const UserModel =
{
	create: function(newUser, callback)
	{
		// Determine initials from forename+name
		let forenameParts = newUser.forename.split(/[ -]+/);
		let nameParts = newUser.name.split(/[ -]+/);
		let initials =
			forenameParts.map( n => { return n.charAt(0).toLowerCase(); }).join("") +
			nameParts.map( n => { return n.charAt(0).toLowerCase(); }).join("");
		// First retrieve all users with similar prefix initials
		UserEntity.getInitialsByPrefix(initials, (err,userArray) => {
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
			UserEntity.insert(newUser, callback);
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

	logout: function(uid, token, cb)
	{
		UserEntity.removeToken(uid, token, cb);
	},

	cleanUsersDb: function()
	{
		UserEntity.getUnlogged( (err,unlogged) => {
			UserEntity.remove(unlogged);
		});
	},
}

module.exports = UserModel;
