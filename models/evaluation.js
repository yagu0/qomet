const CourseModel = require("../models/course");
const UserModel = require("../models/user");
const ObjectId = require("bson-objectid");
const TokenGen = require("../utils/tokenGenerator");
const db = require("../utils/database");

const EvaluationModel =
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
	 *     wording: varchar (HTML) with potential placeholders for params
	 *     options: array of varchar --> if present, question type == quiz!
	 *     fixed: bool, options in fixed order (default: false)
	 *     points: points for this question (default 1)
	 *   answers:
	 *     array of index +
	 *       array of integers (for quiz) or
	 *       html text (for paper) or
	 *       function (as string, for parameterized questions)
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

	getById: function(eid, callback)
	{
		db.evaluations.findOne(
			{ _id: eid },
			callback
		);
	},

	getByPath: function(cid, name, callback)
	{
		db.evaluations.findOne(
			{
				cid: cid,
				name: name,
			},
			callback
		);
	},

	insert: function(cid, name, callback)
	{
		db.evaluations.insert(
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
				answers: [ ],
				papers: [ ],
			},
			callback
		);
	},

	getByCourse: function(cid, callback)
	{
		db.evaluations.find(
			{ cid: cid },
			callback
		);
	},

	// arg: full evaluation without _id field
	replace: function(eid, evaluation, cb)
	{
		// Should be: (but unsupported by mongojs)
//		db.evaluations.replaceOne(
//			{ _id: eid },
//			evaluation,
//			cb
//		);
		// Temporary workaround:
		db.evaluations.update(
			{ _id: eid },
			{ $set: evaluation },
			cb
		);
	},

	getQuestions: function(eid, callback)
	{
		db.evaluations.findOne(
			{
				_id: eid,
				display: "all",
			},
			{ questions: 1},
			(err,res) => {
				callback(err, !!res ? res.questions : null);
			}
		);
	},

	getQuestion: function(eid, index, callback)
	{
		db.evaluations.findOne(
			{
				_id: eid,
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

	getPaperByNumber: function(eid, number, callback)
	{
		db.evaluations.findOne(
			{
				_id: eid,
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

	addDisco: function(eid, number, deltaTime)
	{
		db.evaluations.update(
			{
				_id: eid,
				"papers.number": number,
			},
			{ $inc: {
				"papers.$.discoCount": 1,
				"papers.$.totalDisco": deltaTime,
			} },
			{ $set: { "papers.$.discoTime": null } }
		);
	},

	setDiscoTime: function(eid, number)
	{
		db.evaluations.update(
			{
				_id: eid,
				"papers.number": number,
			},
			{ $set: { "papers.$.discoTime": Date.now() } }
		);
	},

	getDiscoTime: function(eid, number, cb)
	{
		db.evaluations.findOne(
			{ _id: eid },
			(err,a) => {
				if (!!err)
					return cb(err, null);
				const idx = a.papers.findIndex( item => { return item.number == number; });
				cb(null, a.papers[idx].discoTime);
			}
		);
	},

	hasInput: function(eid, number, password, idx, cb)
	{
		db.evaluations.findOne(
			{
				_id: eid,
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
	setInput: function(eid, number, password, input, callback) //input: index + arrayOfInt (or txt)
	{
		db.evaluations.update(
			{
				_id: eid,
				"papers.number": number,
				"papers.password": password,
			},
			{ $push: { "papers.$.inputs": input } },
			callback
		);
	},

	endEvaluation: function(eid, number, password, callback)
	{
		db.evaluations.update(
			{
				_id: eid,
				"papers.number": number,
				"papers.password": password,
			},
			{ $set: {
				"papers.$.password": "",
			} },
			callback
		);
	},

	remove: function(eid, cb)
	{
		db.evaluations.remove(
			{ _id: eid },
			cb
		);
	},

	removeGroup: function(cid, cb)
	{
		db.evaluations.remove(
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
				EvaluationModel.getByPath(course._id, name, (err3,evaluation) => {
					if (!!err3 || !evaluation)
						return cb(err3 || {errmsg: "Evaluation not found"});
					cb(null,evaluation);
				});
			});
		});
	},

	checkPassword: function(eid, number, password, cb)
	{
		EvaluationModel.getById(eid, (err,evaluation) => {
			if (!!err || !evaluation)
				return cb(err, evaluation);
			const paperIdx = evaluation.papers.findIndex( item => { return item.number == number; });
			if (paperIdx === -1)
				return cb({errmsg: "Paper not found"}, false);
			cb(null, evaluation.papers[paperIdx].password == password);
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
			// 2) Insert new blank evaluation
			EvaluationModel.insert(cid, name, cb);
		});
	},

	update: function(uid, evaluation, cb)
	{
		const eid = ObjectId(evaluation._id);
		// 1) Check that evaluation is owned by user of ID uid
		EvaluationModel.getById(eid, (err,evaluationOld) => {
			if (!!err || !evaluationOld)
				return cb({errmsg: "Evaluation retrieval failure"});
			CourseModel.getById(ObjectId(evaluationOld.cid), (err2,course) => {
				if (!!err2 || !course)
					return cb({errmsg: "Course retrieval failure"});
				if (!course.uid.equals(uid))
					return cb({errmsg:"Not your course"},undefined);
				// 2) Replace evaluation
				delete evaluation["_id"];
				evaluation.cid = ObjectId(evaluation.cid);
				EvaluationModel.replace(eid, evaluation, cb);
			});
		});
	},

	// Set password in responses collection
	startSession: function(eid, number, password, cb)
	{
		EvaluationModel.getPaperByNumber(eid, number, (err,paper) => {
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
			EvaluationModel.getQuestions(eid, (err2,questions) => {
				if (!!err2)
					return cb(err2,null);
				if (!!paper)
					return cb(null,{paper:paper});
				const pwd = TokenGen.generate(12); //arbitrary number, 12 seems enough...
				db.evaluations.update(
					{ _id: eid },
					{ $push: { papers: {
						number: number,
						startTime: Date.now(),
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

	newAnswer: function(eid, number, password, input, cb)
	{
		// Check that student hasn't already answered
		EvaluationModel.hasInput(eid, number, password, input.index, (err,ret) => {
			if (!!err)
				return cb(err,null);
			if (!!ret)
				return cb({errmsg:"Question already answered"},null);
			EvaluationModel.setInput(eid, number, password, input, (err2,ret2) => {
				if (!!err2 || !ret2)
					return cb(err2,ret2);
				return cb(null,ret2);
			});
		});
	},

	// NOTE: no callbacks for next function, failures are not so important
	// (because monitored: teachers can see what's going on)
	newConnection: function(eid, number)
	{
		//increment discoCount, reset discoTime to NULL, update totalDisco
		EvaluationModel.getDiscoTime(eid, number, (err,discoTime) => {
			if (!!discoTime)
				EvaluationModel.addDisco(eid, number, Date.now() - discoTime);
		});
	},
}

module.exports = EvaluationModel;
