let router = require("express").Router();
const access = require("../utils/access");
const UserModel = require("../models/user");
const EvaluationModel = require("../models/evaluation");
const CourseModel = require("../models/course");

// Actual pages (least specific last)

// List initials and count evaluations
router.get("/", (req,res) => {
	UserModel.getAll( (err,userArray) => {
		if (!!err)
			return res.json(err);
		res.render("index", {
			title: "home",
			userArray: userArray,
		});
	});
});

// Login screen
router.get("/login", access.unlogged, (req,res) => {
	res.render("login", {
		title: "login",
	});
});

// Redirection screens when possible cheating attempt detected in exam
router.get("/enablejs", (req,res) => {
	res.render("enablejs", {
		title: "JS disabled",
	});
});

router.get("/fullscreen", (req,res) => {
	res.render("fullscreen", {
		title: "Not in fullscreen",
	});
});

router.get("/noblur", (req,res) => {
	res.render("noblur", {
		title: "Lost focus",
	});
});

// List courses of some user (should be [a-z]+[0-9]* but fails...)
router.get("/:initials([a-z0-9]+)", (req,res) => {
	let initials = req.params["initials"];
	CourseModel.getByInitials(initials, (err,courseArray) => {
		if (!!err)
			return res.json(err);
		access.getUser(req, res, (err2,user) => {
			const isTeacher = !!user && user.initials == initials;
			// Strip students from courses if not course admin (TODO: not required in any case)
			if (!isTeacher)
			{
				courseArray.forEach( c => {
					delete c["students"];
				});
			}
			res.render("course-list", {
				title: initials + " courses",
				courseArray: courseArray,
				teacher: isTeacher,
				initials: initials,
			});
		});
	});
});

// Detailed content of one course
router.get("/:initials([a-z0-9]+)/:courseCode([a-z0-9._-]+)", (req,res) => {
	let initials = req.params["initials"];
	let code = req.params["courseCode"];
	CourseModel.getByRefs(initials, code, (err,course) => {
		access.checkRequest(res, err, course, "Course not found", () => {
			EvaluationModel.getByCourse(course._id, (err2,evaluationArray) => {
				if (!!err)
					return res.json(err);
				access.getUser(req, res, (err2,user) => {
					const isTeacher = !!user && user.initials == initials;
					// Strip students from course if not course admin
					if (!isTeacher)
						delete course["students"];
					res.render("course", {
						title: "course " + initials + "/" + code,
						course: course,
						evaluationArray: evaluationArray,
						teacher: isTeacher,
						initials: initials,
					});
				});
			});
		});
	});
});

// Grading students answers: --> after identification (password), always send secret with requests
router.get("/:initials([a-z0-9]+)/:courseCode([a-z0-9._-]+)/grade", (req,res) => {
	let initials = req.params["initials"];
	let code = req.params["courseCode"];
	// TODO: if (main) teacher, also send secret, saving one request
	res.render("grade", {
		title: "grade exams " + code + "/" + name,
		initials: initials,
		courseCode: code,
	});
});

// Display evaluation (exam or open status)
router.get("/:initials([a-z0-9]+)/:courseCode([a-z0-9._-]+)/:evaluationName([a-z0-9._-]+)", (req,res) => {
	let initials = req.params["initials"];
	let code = req.params["courseCode"];
	let name = req.params["evaluationName"];
	EvaluationModel.getByRefs(initials, code, name, (err,evaluation) => {
		access.checkRequest(res, err, evaluation, "Evaluation not found", () => {
			if (!evaluation.active)
				return res.json({errmsg: "Evaluation is idle"});
			delete evaluation["papers"]; //always remove recorded students answers
			if (evaluation.mode == "exam")
			{
				if (!!req.headers['user-agent'].match(/(SpecialAgent|HeadlessChrome|PhantomJS)/))
				{
					// Basic headless browser detection
					return res.json({errmsg: "Headless browser detected"});
				}
				// Strip questions if exam mode (stepwise process)
				delete evaluation["questions"];
			}
			res.render("evaluation", {
				title: "evaluation " + initials + "/" + code + "/" + name,
				evaluation: evaluation,
			});
		});
	});
});

// Monitor: --> after identification (password), always send secret with requests
router.get("/:initials([a-z0-9]+)/:courseCode([a-z0-9._-]+)/:evaluationName([a-z0-9._-]+)/monitor", (req,res) => {
	let initials = req.params["initials"];
	let code = req.params["courseCode"];
	let name = req.params["evaluationName"];
	// TODO: if (main) teacher, also send secret, saving one request
	res.render("monitor", {
		title: "monitor evaluation " + code + "/" + name,
		initials: initials,
		courseCode: code,
		examName: name,
	});
});

module.exports = router;
