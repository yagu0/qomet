const CourseEntity = require("../entities/course");
const UserEntity = require("../entities/user");
const AssessmentEntity = require("../entities/assessment");

const CourseModel =
{
	getByInitials: function(initials, callback)
	{
		UserEntity.getByInitials(initials, (err,user) => {
			if (!!err || !user)
				callback(err, []);
			else
			{
				CourseEntity.getByUser(user._id, (err2,courseArray) => {
					callback(err2, courseArray);
				});
			}
		});
	},

	getByRefs: function(initials, code, callback)
	{
		UserEntity.getByInitials(initials, (err,user) => {
			if (!!err || !user)
				callback(err, []);
			else
			{
				CourseEntity.getByPath(user._id, code, (err2,course) => {
					callback(err2, course);
				});
			}
		});
	},

	importStudents: function(uid, cid, students, cb)
	{
		// 1) check if uid == course uid
		CourseEntity.getById(cid, (err,course) => {
			if (!!err || !course || !course.uid.equals(uid))
				return cb({errmsg:"Not your course"},{});
			// 2) Set students
			CourseEntity.setStudents(cid, students, cb);
		});
	},

	setPassword: function(uid, cid, pwd, cb)
	{
		// 1) check if uid == course uid
		CourseEntity.getById(cid, (err,course) => {
			if (!!err || !course || !course.uid.equals(uid))
				return cb({errmsg:"Not your course"},{});
			// 2) Insert new student (overwrite if number already exists)
			CourseEntity.setPassword(cid, pwd, cb);
		});
	},

	remove: function(uid, cid, cb)
	{
		// 1) check if uid == course uid
		CourseEntity.getById(cid, (err,course) => {
			if (!!err || !course || !course.uid.equals(uid))
				return cb({errmsg:"Not your course"},{});
			// 2) remove all associated assessments
			AssessmentEntity.removeGroup(cid, (err2,ret) => {
				if (!!err)
					return cb(err,{});
				// 3) remove course (with its students)
				CourseEntity.remove(cid, cb);
			});
		});
	},
}

module.exports = CourseModel;
