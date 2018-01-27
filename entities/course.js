const db = require("../utils/database");

const CourseEntity =
{
	/*
	 * Structure:
	 *   _id: BSON id
	 *   uid: prof ID
	 *   code: varchar
	 *   description: varchar
	 *   password: monitoring password hash
	 *   students: array of
	 *     number: student number
	 *     forename: varchar
	 *     name: varchar
	 *     group: integer
	 */

	getByUser: function(uid, callback)
	{
		db.courses.find(
			{ uid: uid },
			callback
		);
	},

	getById: function(cid, callback)
	{
		db.courses.findOne(
			{ _id: cid },
			callback
		);
	},

	getByPath: function(uid, code, callback)
	{
		db.courses.findOne(
			{
				$and: [
					{ uid: uid },
					{ code: code },
				]
			},
			callback
		);
	},

	insert: function(uid, code, description, cb)
	{
		db.courses.insert(
			{
				uid: uid,
				code: code,
				description: description,
				students: [ ],
			},
			cb);
	},

	setStudents: function(cid, students, cb)
	{
		db.courses.update(
			{ _id: cid },
			{ $set: { students: students } },
			cb
		);
	},

	// Note: return { students: { ... } }, pointing on the requested row
	getStudent: function(cid, number, cb)
	{
		db.courses.findOne(
			{ _id: cid },
			{
				_id: 0,
				students: { $elemMatch: {number: number} }
			},
			cb
		);
	},

	setPassword: function(cid, pwd, cb)
	{
		db.courses.update(
			{ _id: cid },
			{ $set: { password: pwd } },
			cb
		);
	},

	remove: function(cid, cb)
	{
		db.courses.remove(
			{ _id: cid },
			cb
		);
	},
}

module.exports = CourseEntity;
