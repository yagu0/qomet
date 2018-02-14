let router = require("express").Router();
const access = require("../utils/access");
const UserModel = require("../models/user");
const AssessmentModel = require("../models/assessment");
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

router.post("/assessments", access.ajax, access.logged, (req,res) => {
	const name = req.body["name"];
	const cid = req.body["cid"];
	let error = validator({cid:cid, name:name}, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	AssessmentModel.add(req.user._id, ObjectId(cid), name, (err,assessment) => {
		access.checkRequest(res, err, assessment, "Assessment addition failed", () => {
			res.json(assessment);
		});
	});
});

router.put("/assessments", access.ajax, access.logged, (req,res) => {
	const assessment = JSON.parse(req.body["assessment"]);
	let error = validator(assessment, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	assessment.introduction = sanitizeHtml(assessment.introduction, sanitizeOpts);
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
router.put("/assessments/start", access.ajax, (req,res) => {
	let number = req.body["number"];
	let aid = req.body["aid"];
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
			res.json(ret); //contains password (or paper if resuming)
		});
	});
});

router.get("/assessments/monitor", access.ajax, (req,res) => {
	const password = req.query["password"];
	const examName = req.query["aname"];
	const courseCode = req.query["ccode"];
	const initials = req.query["initials"];
	// TODO: sanity checks
	CourseModel.getByRefs(initials, courseCode, (err,course) => {
		access.checkRequest(res,err,course,"Course not found", () => {
			if (password != course.password)
				return res.json({errmsg: "Wrong password"});
			AssessmentModel.getByRefs(initials, courseCode, examName, (err2,assessment) => {
				access.checkRequest(res,err2,assessment,"Assessment not found", () => {
					res.json({
						students: course.students,
						assessment: assessment,
						secret: params.secret,
					});
				});
			});
		});
	});
});

router.put("/assessments/answer", access.ajax, (req,res) => {
	let aid = req.body["aid"];
	let number = req.body["number"];
	let password = req.body["password"];
	let input = JSON.parse(req.body["answer"]);
	let error = validator({ _id:aid, papers:[{number:number,password:password,inputs:[input]}] }, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	AssessmentModel.newAnswer(ObjectId(aid), number, password, input, (err,ret) => {
		access.checkRequest(res,err,ret,"Cannot send answer", () => {
			res.json({});
		});
	});
});

router.put("/assessments/end", access.ajax, (req,res) => {
	let aid = req.body["aid"];
	let number = req.body["number"];
	let password = req.body["password"];
	let error = validator({ _id:aid, papers:[{number:number,password:password}] }, "Assessment");
	if (error.length > 0)
		return res.json({errmsg:error});
	// Destroy pwd, set endTime
	AssessmentModel.endAssessment(ObjectId(aid), number, password, (err,ret) => {
		access.checkRequest(res,err,ret,"Cannot end assessment", () => {
			res.clearCookie('password');
			res.json({});
		});
	});
});

module.exports = router;
