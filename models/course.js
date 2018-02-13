const UserModel = require("../models/user");
const AssessmentModel = require("../models/assessment");
const db = require("../utils/database");

const CourseModel =
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
	 *     name: varchar
	 *     group: integer
	 */

	//////////////////
	// BASIC FUNCTIONS

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

	/////////////////////
	// ADVANCED FUNCTIONS

	getByInitials: function(initials, callback)
	{
		UserModel.getByInitials(initials, (err,user) => {
			if (!!err || !user)
				callback(err, []);
			else
			{
				CourseModel.getByUser(user._id, (err2,courseArray) => {
					callback(err2, courseArray);
				});
			}
		});
	},

	getByRefs: function(initials, code, callback)
	{
		UserModel.getByInitials(initials, (err,user) => {
			if (!!err || !user)
				callback(err, []);
			else
			{
				CourseModel.getByPath(user._id, code, (err2,course) => {
					callback(err2, course);
				});
			}
		});
	},

	importStudents: function(uid, cid, students, cb)
	{
		// 1) check if uid == course uid
		CourseModel.getById(cid, (err,course) => {
			if (!!err || !course || !course.uid.equals(uid))
				return cb({errmsg:"Not your course"},{});
			// 2) Set students
			CourseModel.setStudents(cid, students, cb);
		});
	},

	setPassword: function(uid, cid, pwd, cb)
	{
		// 1) check if uid == course uid
		CourseModel.getById(cid, (err,course) => {
			if (!!err || !course || !course.uid.equals(uid))
				return cb({errmsg:"Not your course"},{});
			// 2) Insert new student (overwrite if number already exists)
			CourseModel.setPassword(cid, pwd, cb);
		});
	},

	remove: function(uid, cid, cb)
	{
		// 1) check if uid == course uid
		CourseModel.getById(cid, (err,course) => {
			if (!!err || !course || !course.uid.equals(uid))
				return cb({errmsg:"Not your course"},{});
			// 2) remove all associated assessments
			AssessmentModel.removeGroup(cid, (err2,ret) => {
				if (!!err)
					return cb(err,{});
				// 3) remove course (with its students)
				CourseModel.remove(cid, cb);
			});
		});
	},
}

module.exports = CourseModel;
