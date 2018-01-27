const db = require("../utils/database");

const AssessmentEntity =
{
	/*
	 * Structure:
	 *   _id: BSON id
	 *   cid: course ID
	 *   name: varchar
	 *   active: boolean true/false
	 *   mode: secure | exam | open (decreasing security)
	 *   fixed: bool (questions in fixed order; default: false)
	 *   display: "one" or "all" (generally "all" for open questions, but...)
	 *   time: 0, //<=0 means "untimed"; otherwise, time in seconds
	 *   introduction: "",
	 *   conclusion: "https://www.youtube.com/watch?v=6-9AjToJYuw",
	 *   coefficient: number, default 1
	 *   questions: array of
	 *     index: for paper test, like 2.1.a (?!); and quiz: 0, 1, 2, 3...
	 *     wording: varchar (HTML)
	 *     options: array of varchar --> if present, question type == quiz!
	 *     fixed: bool, options in fixed order (default: false)
	 *     answer: array of integers (for quiz) or html text (for paper); striped in exam mode
	 *     active: boolean, is question in current assessment? --> striped if inactive!
	 *     points: points for this question (default 1)
	 *   papers : array of
	 *     number: student number
	 *     inputs: array of indexed arrays of integers (or html text if not quiz)
	 *     startTime, endTime
	 *     password: random string identifying student for exam session TEMPORARY
	 */

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
				conclusion: "",
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
			{ _id: aid },
			{ questions: 1},
			(err,res) => {
				callback(err, !!res ? res.questions : null);
			}
		);
	},

	startSession: function(aid, number, password, callback)
	{
		// TODO: security, do not re-do tasks if already done
		db.assessments.update(
			{ _id: aid },
			{ $push: { papers: {
				number: number,
				startTime: Date.now(),
				endTime: undefined,
				password: password,
				inputs: [ ], //TODO: this is stage 1, stack indexed answers.
				// then build JSON tree for easier access / correct
			}}},
			callback
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

	getConclusion: function(aid, callback)
	{
		db.assessments.findOne(
			{ _id: aid },
			{ conclusion: 1},
			(err,res) => {
				callback(err, !!res ? res.conclusion : null);
			}
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
}

module.exports = AssessmentEntity;