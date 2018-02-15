let router = require("express").Router();
const access = require("../utils/access");
const UserModel = require("../models/user");
const EvaluationModel = require("../models/evaluation");
const CourseModel = require("../models/course");
const params = require("../config/parameters");
const validator = require("../public/javascripts/utils/validation");
const ObjectId = require("bson-objectid");
const sanitizeHtml = require('sanitize-html');
const sanitizeOpts = {
	allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'u' ]),
	allowedAttributes: {
		img: [ 'src','style' ],
		code: [ 'class' ],
		table: [ 'class' ],
		div: [ 'style' ],
	},
};

router.post("/evaluations", access.ajax, access.logged, (req,res) => {
	const name = req.body["name"];
	const cid = req.body["cid"];
	let error = validator({cid:cid, name:name}, "Evaluation");
	if (error.length > 0)
		return res.json({errmsg:error});
	EvaluationModel.add(req.user._id, ObjectId(cid), name, (err,evaluation) => {
		access.checkRequest(res, err, evaluation, "Evaluation addition failed", () => {
			res.json(evaluation);
		});
	});
});

router.put("/evaluations", access.ajax, access.logged, (req,res) => {
	const evaluation = JSON.parse(req.body["evaluation"]);
	let error = validator(evaluation, "Evaluation");
	if (error.length > 0)
		return res.json({errmsg:error});
	evaluation.introduction = sanitizeHtml(evaluation.introduction, sanitizeOpts);
	evaluation.questions.forEach( q => {
		q.wording = sanitizeHtml(q.wording, sanitizeOpts);
		//q.answer = sanitizeHtml(q.answer); //if text (TODO: it's an array in this case?!)
		for (let i=0; i<q.options.length; i++) //if QCM
			q.options[i] = sanitizeHtml(q.options[i], sanitizeOpts);
	});
	EvaluationModel.update(req.user._id, evaluation, (err,ret) => {
		access.checkRequest(res, err, ret, "Evaluation update failed", () => {
			res.json({});
		});
	});
});

// Generate and set student password, return it
router.put("/evaluations/start", access.ajax, (req,res) => {
	let number = req.body["number"];
	let eid = req.body["eid"];
	let password = req.cookies["password"]; //potentially from cookies, resuming
	let error = validator({ _id:eid, papers:[{number:number,password:password || "samplePwd"}] }, "Evaluation");
	if (error.length > 0)
		return res.json({errmsg:error});
	EvaluationModel.startSession(ObjectId(eid), number, password, (err,ret) => {
		access.checkRequest(res,err,ret,"Failed session initialization", () => {
			if (!password)
			{
				// Set password
				res.cookie("password", ret.password, {
					httpOnly: true,
					maxAge: params.cookieExpire,
				});
			}
			res.json(ret); //contains password (or paper if resuming)
		});
	});
});

router.get("/evaluations/monitor", access.ajax, (req,res) => {
	const password = req.query["password"];
	const examName = req.query["aname"];
	const courseCode = req.query["ccode"];
	const initials = req.query["initials"];
	// TODO: sanity checks
	CourseModel.getByRefs(initials, courseCode, (err,course) => {
		access.checkRequest(res,err,course,"Course not found", () => {
			if (password != course.password)
				return res.json({errmsg: "Wrong password"});
			EvaluationModel.getByRefs(initials, courseCode, examName, (err2,evaluation) => {
				access.checkRequest(res,err2,evaluation,"Evaluation not found", () => {
					res.json({
						students: course.students,
						evaluation: evaluation,
						secret: params.secret,
					});
				});
			});
		});
	});
});

router.put("/evaluations/answer", access.ajax, (req,res) => {
	let eid = req.body["eid"];
	let number = req.body["number"];
	let password = req.body["password"];
	let input = JSON.parse(req.body["answer"]);
	let error = validator({ _id:eid, papers:[{number:number,password:password,inputs:[input]}] }, "Evaluation");
	if (error.length > 0)
		return res.json({errmsg:error});
	EvaluationModel.newAnswer(ObjectId(eid), number, password, input, (err,ret) => {
		access.checkRequest(res,err,ret,"Cannot send answer", () => {
			res.json({});
		});
	});
});

router.put("/evaluations/end", access.ajax, (req,res) => {
	let eid = req.body["eid"];
	let number = req.body["number"];
	let password = req.body["password"];
	let error = validator({ _id:eid, papers:[{number:number,password:password}] }, "Evaluation");
	if (error.length > 0)
		return res.json({errmsg:error});
	// Destroy pwd, set endTime
	EvaluationModel.endEvaluation(ObjectId(eid), number, password, (err,ret) => {
		access.checkRequest(res,err,ret,"Cannot end evaluation", () => {
			res.clearCookie('password');
			res.json({});
		});
	});
});

module.exports = router;
