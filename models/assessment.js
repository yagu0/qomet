const AssessmentEntity = require("../entities/assessment");
const CourseEntity = require("../entities/course");
const ObjectId = require("bson-objectid");
const UserEntity = require("../entities/user");
const TokenGen = require("../utils/tokenGenerator");

const AssessmentModel =
{
	getByRefs: function(initials, code, name, cb)
	{
		UserEntity.getByInitials(initials, (err,user) => {
			if (!!err || !user)
				return cb(err || {errmsg: "User not found"});
			CourseEntity.getByPath(user._id, code, (err2,course) => {
				if (!!err2 || !course)
					return cb(err2 || {errmsg: "Course not found"});
				AssessmentEntity.getByPath(course._id, name, (err3,assessment) => {
					if (!!err3 || !assessment)
						return cb(err3 || {errmsg: "Assessment not found"});
					cb(null,assessment);
				});
			});
		});
	},

	checkPassword: function(aid, number, password, cb)
	{
		AssessmentEntity.getById(aid, (err,assessment) => {
			if (!!err || !assessment)
				return cb(err, assessment);
			const paperIdx = assessment.papers.findIndex( item => { return item.number == number; });
			if (paperIdx === -1)
				return cb({errmsg: "Paper not found"}, false);
			cb(null, assessment.papers[paperIdx].password == password);
		});
	},

	add: function(uid, cid, name, cb)
	{
		// 1) Check that course is owned by user of ID uid
		CourseEntity.getById(cid, (err,course) => {
			if (!!err || !course)
				return cb({errmsg: "Course retrieval failure"});
			if (!course.uid.equals(uid))
				return cb({errmsg:"Not your course"},undefined);
			// 2) Insert new blank assessment
			AssessmentEntity.insert(cid, name, cb);
		});
	},

	update: function(uid, assessment, cb)
	{
		const aid = ObjectId(assessment._id);
		// 1) Check that assessment is owned by user of ID uid
		AssessmentEntity.getById(aid, (err,assessmentOld) => {
			if (!!err || !assessmentOld)
				return cb({errmsg: "Assessment retrieval failure"});
			CourseEntity.getById(ObjectId(assessmentOld.cid), (err2,course) => {
				if (!!err2 || !course)
					return cb({errmsg: "Course retrieval failure"});
				if (!course.uid.equals(uid))
					return cb({errmsg:"Not your course"},undefined);
				// 2) Replace assessment
				delete assessment["_id"];
				assessment.cid = ObjectId(assessment.cid);
				AssessmentEntity.replace(aid, assessment, cb);
			});
		});
	},

	// Set password in responses collection
	startSession: function(aid, number, password, cb)
	{
		AssessmentEntity.getPaperByNumber(aid, number, (err,paper) => {
			if (!!err)
				return cb(err,null);
			if (!paper && !!password)
				return cb({errmsg: "Cannot start a new exam before finishing current"},null);
			if (!!paper)
			{
				if (!password)
					return cb({errmsg: "Missing password"});
				if (paper.password != password)
					return cb({errmsg: "Wrong password"});
			}
			AssessmentEntity.getQuestions(aid, (err,questions) => {
				if (!!err)
					return cb(err,null);
				if (!!paper)
					return cb(null,{paper:paper,questions:questions});
				const pwd = TokenGen.generate(12); //arbitrary number, 12 seems enough...
				AssessmentEntity.startSession(aid, number, pwd, (err2,ret) => {
					cb(err2, {
						questions: questions,
						password: pwd,
					});
				});
			});
		});
	},

	newAnswer: function(aid, number, password, input, cb)
	{
		// Check that student hasn't already answered
		AssessmentEntity.hasInput(aid, number, password, input.index, (err,ret) => {
			if (!!err)
				return cb(err,null);
			if (!!ret)
				return cb({errmsg:"Question already answered"},null);
			AssessmentEntity.setInput(aid, number, password, input, (err2,ret2) => {
				if (!!err2 || !ret2)
					return cb(err2,ret2);
				return cb(null,ret2);
			});
		});
	},

	// NOTE: no callbacks for 2 next functions, failures are not so important
	// (because monitored: teachers can see what's going on)

	newConnection: function(aid, number)
	{
		//increment discoCount, reset discoTime to NULL, update totalDisco
		AssessmentEntity.getDiscoTime(aid, number, (err,discoTime) => {
			if (!!discoTime)
				AssessmentEntity.addDisco(aid, number, Date.now() - discoTime);
		});
	},

	endSession: function(aid, number, password, cb)
	{
		AssessmentEntity.endAssessment(aid, number, password, (err,ret) => {
			if (!!err || !ret)
				return cb(err,ret);
			AssessmentEntity.getConclusion(aid, (err2,conclusion) => {
				cb(err2, {conclusion:conclusion});
			});
		});
	},
};

module.exports = AssessmentModel;
