const CourseModel = require("../models/course");
const UserModel = require("../models/user");
const ObjectId = require("bson-objectid");
const TokenGen = require("../utils/tokenGenerator");
const db = require("../utils/database");

const AssessmentModel =
{
	/*
	 * Structure:
	 *   _id: BSON id
	 *   cid: course ID
	 *   name: varchar
	 *   active: boolean
	 *   mode: secure | watch | exam | open (decreasing security)
	 *   fixed: bool (questions in fixed order; default: false)
	 *   display: "one" or "all" (generally "all" for open questions, but...)
	 *   time: 0, global (one vaue) or per question (array of integers)
	 *   introduction: "",
	 *   coefficient: number, default 1
	 *   questions: array of
	 *     index: for paper test, like 2.1.a (?!); and quiz: 0, 1, 2, 3...
	 *     wording: varchar (HTML)
	 *     options: array of varchar --> if present, question type == quiz!
	 *     fixed: bool, options in fixed order (default: false)
	 *     answer: array of integers (for quiz) or html text (for paper); striped in exam mode
	 *     active: boolean, is question in current assessment?
	 *     points: points for this question (default 1)
	 *   papers : array of
	 *     number: student number
	 *     inputs: array of {index,answer[array of integers or html text],startTime}
	 *     current: index of current question (if relevant: display="one")
	 *     startTime
	 *     discoTime, totalDisco: last disconnect timestamp (if relevant) + total time
	 *     discoCount: number of disconnections
	 *     password: random string identifying student for exam session TEMPORARY
	 */

	//////////////////
	// BASIC FUNCTIONS

	getById: function(aid, callback)
	{
		db.assessments.findOne(
			{ _id: aid },
			callback
		);
	},

	getByPath: function(cid, name, callback)
	{
		db.assessments.findOne(
			{
				cid: cid,
				name: name,
			},
			callback
		);
	},

	insert: function(cid, name, callback)
	{
		db.assessments.insert(
			{
				name: name,
				cid: cid,
				active: false,
				mode: "exam",
				fixed: false,
				display: "one",
				time: 0,
				introduction: "",
				coefficient: 1,
				questions: [ ],
				papers: [ ],
			},
			callback
		);
	},

	getByCourse: function(cid, callback)
	{
		db.assessments.find(
			{ cid: cid },
			callback
		);
	},

	// arg: full assessment without _id field
	replace: function(aid, assessment, cb)
	{
		// Should be: (but unsupported by mongojs)
//		db.assessments.replaceOne(
//			{ _id: aid },
//			assessment,
//			cb
//		);
		// Temporary workaround:
		db.assessments.update(
			{ _id: aid },
			{ $set: assessment },
			cb
		);
	},

	getQuestions: function(aid, callback)
	{
		db.assessments.findOne(
			{
				_id: aid,
				display: "all",
			},
			{ questions: 1},
			(err,res) => {
				callback(err, !!res ? res.questions : null);
			}
		);
	},

	getQuestion: function(aid, index, callback)
	{
		db.assessments.findOne(
			{
				_id: aid,
				display: "one",
			},
			{ questions: 1},
			(err,res) => {
				if (!!err || !res)
					return callback(err, res);
				const qIdx = res.questions.findIndex( item => { return item.index == index; });
				if (qIdx === -1)
					return callback({errmsg: "Question not found"}, null);
				callback(null, res.questions[qIdx]);
			}
		);
	},

	getPaperByNumber: function(aid, number, callback)
	{
		db.assessments.findOne(
			{
				_id: aid,
				"papers.number": number,
			},
			(err,a) => {
				if (!!err || !a)
					return callback(err,a);
				for (let p of a.papers)
				{
					if (p.number == number)
						return callback(null,p); //reached for sure
				}
			}
		);
	},

	// NOTE: no callbacks for 2 next functions, failures are not so important
	// (because monitored: teachers can see what's going on)

	addDisco: function(aid, number, deltaTime)
	{
		db.assessments.update(
			{
				_id: aid,
				"papers.number": number,
			},
			{ $inc: {
				"papers.$.discoCount": 1,
				"papers.$.totalDisco": deltaTime,
			} },
			{ $set: { "papers.$.discoTime": null } }
		);
	},

	setDiscoTime: function(aid, number)
	{
		db.assessments.update(
			{
				_id: aid,
				"papers.number": number,
			},
			{ $set: { "papers.$.discoTime": Date.now() } }
		);
	},

	getDiscoTime: function(aid, number, cb)
	{
		db.assessments.findOne(
			{ _id: aid },
			(err,a) => {
				if (!!err)
					return cb(err, null);
				const idx = a.papers.findIndex( item => { return item.number == number; });
				cb(null, a.papers[idx].discoTime);
			}
		);
	},

	hasInput: function(aid, number, password, idx, cb)
	{
		db.assessments.findOne(
			{
				_id: aid,
				"papers.number": number,
				"papers.password": password,
			},
			(err,a) => {
				if (!!err || !a)
					return cb(err,a);
				let papIdx = a.papers.findIndex( item => { return item.number == number; });
				for (let i of a.papers[papIdx].inputs)
				{
					if (i.index == idx)
						return cb(null,true);
				}
				cb(null,false);
			}
		);
	},

	// https://stackoverflow.com/questions/27874469/mongodb-push-in-nested-array
	setInput: function(aid, number, password, input, callback) //input: index + arrayOfInt (or txt)
	{
		db.assessments.update(
			{
				_id: aid,
				"papers.number": number,
				"papers.password": password,
			},
			{ $push: { "papers.$.inputs": input } },
			callback
		);
	},

	endAssessment: function(aid, number, password, callback)
	{
		db.assessments.update(
			{
				_id: aid,
				"papers.number": number,
				"papers.password": password,
			},
			{ $set: {
				"papers.$.endTime": Date.now(),
				"papers.$.password": "",
			} },
			callback
		);
	},

	remove: function(aid, cb)
	{
		db.assessments.remove(
			{ _id: aid },
			cb
		);
	},

	removeGroup: function(cid, cb)
	{
		db.assessments.remove(
			{ cid: cid },
			cb
		);
	},

	/////////////////////
	// ADVANCED FUNCTIONS

	getByRefs: function(initials, code, name, cb)
	{
		UserModel.getByInitials(initials, (err,user) => {
			if (!!err || !user)
				return cb(err || {errmsg: "User not found"});
			CourseModel.getByPath(user._id, code, (err2,course) => {
				if (!!err2 || !course)
					return cb(err2 || {errmsg: "Course not found"});
				AssessmentModel.getByPath(course._id, name, (err3,assessment) => {
					if (!!err3 || !assessment)
						return cb(err3 || {errmsg: "Assessment not found"});
					cb(null,assessment);
				});
			});
		});
	},

	checkPassword: function(aid, number, password, cb)
	{
		AssessmentModel.getById(aid, (err,assessment) => {
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
		CourseModel.getById(cid, (err,course) => {
			if (!!err || !course)
				return cb({errmsg: "Course retrieval failure"});
			if (!course.uid.equals(uid))
				return cb({errmsg:"Not your course"},undefined);
			// 2) Insert new blank assessment
			AssessmentModel.insert(cid, name, cb);
		});
	},

	update: function(uid, assessment, cb)
	{
		const aid = ObjectId(assessment._id);
		// 1) Check that assessment is owned by user of ID uid
		AssessmentModel.getById(aid, (err,assessmentOld) => {
			if (!!err || !assessmentOld)
				return cb({errmsg: "Assessment retrieval failure"});
			CourseModel.getById(ObjectId(assessmentOld.cid), (err2,course) => {
				if (!!err2 || !course)
					return cb({errmsg: "Course retrieval failure"});
				if (!course.uid.equals(uid))
					return cb({errmsg:"Not your course"},undefined);
				// 2) Replace assessment
				delete assessment["_id"];
				assessment.cid = ObjectId(assessment.cid);
				AssessmentModel.replace(aid, assessment, cb);
			});
		});
	},

	// Set password in responses collection
	startSession: function(aid, number, password, cb)
	{
		AssessmentModel.getPaperByNumber(aid, number, (err,paper) => {
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
			AssessmentModel.getQuestions(aid, (err2,questions) => {
				if (!!err2)
					return cb(err2,null);
				if (!!paper)
					return cb(null,{paper:paper});
				const pwd = TokenGen.generate(12); //arbitrary number, 12 seems enough...
				db.assessments.update(
					{ _id: aid },
					{ $push: { papers: {
						number: number,
						startTime: Date.now(),
						endTime: undefined,
						password: password,
						totalDisco: 0,
						discoCount: 0,
						inputs: [ ], //TODO: this is stage 1, stack indexed answers.
						// then build JSON tree for easier access / correct
					}}},
					(err3,ret) => { cb(err3,{password:password}); }
				);
			});
		});
	},

	newAnswer: function(aid, number, password, input, cb)
	{
		// Check that student hasn't already answered
		AssessmentModel.hasInput(aid, number, password, input.index, (err,ret) => {
			if (!!err)
				return cb(err,null);
			if (!!ret)
				return cb({errmsg:"Question already answered"},null);
			AssessmentModel.setInput(aid, number, password, input, (err2,ret2) => {
				if (!!err2 || !ret2)
					return cb(err2,ret2);
				return cb(null,ret2);
			});
		});
	},

	// NOTE: no callbacks for next function, failures are not so important
	// (because monitored: teachers can see what's going on)
	newConnection: function(aid, number)
	{
		//increment discoCount, reset discoTime to NULL, update totalDisco
		AssessmentModel.getDiscoTime(aid, number, (err,discoTime) => {
			if (!!discoTime)
				AssessmentModel.addDisco(aid, number, Date.now() - discoTime);
		});
	},
}

module.exports = AssessmentModel;
