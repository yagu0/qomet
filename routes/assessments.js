let router = require("express").Router();
const access = require("../utils/access");
const UserModel = require("../models/user");
const AssessmentModel = require("../models/assessment");
const AssessmentEntity = require("../entities/assessment");
const CourseModel = require("../models/course");
const params = require("../config/parameters");
const validator = require("../public/javascripts/utils/validation");
const ObjectId = require("bson-objectid");
const sanitizeHtml = require('sanitize-html');

router.get("/add/assessment", access.ajax, access.logged, (req,res) => {
	const name = req.query["name"];
	const cid = req.query["cid"];
	let error = validator({cid:cid, name:name}, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	AssessmentModel.add(req.user._id, ObjectId(cid), name, (err,assessment) => {
		access.checkRequest(res, err, assessment, "Assessment addition failed", () => {
			res.json(assessment);
		});
	});
});

router.post("/update/assessment", access.ajax, access.logged, (req,res) => {
	const assessment = JSON.parse(req.body["assessment"]);
	let error = validator(assessment, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	const sanitizeOpts = {allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ]) };
	assessment.introduction = sanitizeHtml(assessment.introduction, sanitizeOpts);
	assessment.conclusion = sanitizeHtml(assessment.conclusion, sanitizeOpts);
	assessment.questions.forEach( q => {
		q.wording = sanitizeHtml(q.wording, sanitizeOpts);
		//q.answer = sanitizeHtml(q.answer); //if text (TODO: it's an array in this case?!)
		for (let i=0; i<q.options.length; i++) //if QCM
			q.options[i] = sanitizeHtml(q.options[i], sanitizeOpts);
	});
	AssessmentModel.update(req.user._id, assessment, (err,ret) => {
		access.checkRequest(res, err, ret, "Assessment update failed", () => {
			res.json({});
		});
	});
});

// Generate and set student password, return it
router.get("/start/assessment", access.ajax, (req,res) => {
	let number = req.query["number"];
	let aid = req.query["aid"];
	let password = req.cookies["password"]; //potentially from cookies, resuming
	let error = validator({ _id:aid, papers:[{number:number,password:password || "samplePwd"}] }, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	AssessmentModel.startSession(ObjectId(aid), number, password, (err,ret) => {
		access.checkRequest(res,err,ret,"Failed session initialization", () => {
			if (!password)
			{
				// Set password
				res.cookie("password", ret.password, {
					httpOnly: true,
					maxAge: params.cookieExpire,
				});
			}
			res.json(ret); //contains questions+password(or paper if resuming)
		});
	});
});

router.get("/send/answer", access.ajax, (req,res) => {
	let aid = req.query["aid"];
	let number = req.query["number"];
	let password = req.query["password"];
	let input = JSON.parse(req.query["answer"]);
	let error = validator({ _id:aid, papers:[{number:number,password:password,inputs:[input]}] }, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	AssessmentModel.newAnswer(ObjectId(aid), number, password, input, (err,ret) => {
		access.checkRequest(res,err,ret,"Cannot send answer", () => {
			res.json({});
		});
	});
});

router.get("/end/assessment", access.ajax, (req,res) => {
	let aid = req.query["aid"];
	let number = req.query["number"];
	let password = req.query["password"];
	let error = validator({ _id:aid, papers:[{number:number,password:password}] }, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	// Destroy pwd, set endTime, return conclusion
	AssessmentModel.endSession(ObjectId(aid), number, password, (err,conclusion) => {
		access.checkRequest(res,err,conclusion,"Cannot end assessment", () => {
			res.clearCookie('password');
			res.json(conclusion);
		});
	});
});

module.exports = router;
