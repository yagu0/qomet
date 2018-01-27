let router = require("express").Router();
const access = require("../utils/access.js");
const validator = require("../public/javascripts/utils/validation");
const sanitizeHtml = require('sanitize-html');
const ObjectId = require("bson-objectid");
const CourseEntity = require("../entities/course");
const CourseModel = require("../models/course");

router.get('/add/course', access.ajax, access.logged, (req,res) => {
	let code = req.query["code"];
	let description = sanitizeHtml(req.query["description"]);
	let error = validator({code:code}, "Course");
	if (error.length > 0)
		return res.json({errmsg:error});
	CourseEntity.insert(req.user._id, code, description, (err,course) => {
		access.checkRequest(res, err, course, "Course addition failed", () => {
			res.json(course);
		});
	});
});

router.get("/set/password", access.ajax, access.logged, (req,res) => {
	let cid = req.query["cid"];
	let pwd = req.query["pwd"];
	let error = validator({password:pwd, _id:cid}, "Course");
	if (error.length > 0)
		return res.json({errmsg:error});
	CourseModel.setPassword(req.user._id, ObjectId(cid), pwd, (err,ret) => {
		access.checkRequest(res, err, ret, "password update failed", () => {
			res.json({});
		});
	});
});

router.post('/import/students', access.ajax, access.logged, (req,res) => {
	let cid = req.body["cid"];
	let students = JSON.parse(req.body["students"]);
	let error = validator({_id:cid, students: students}, "Course");
	if (error.length > 0)
		return res.json({errmsg:error});
	access.getUser(req, res, (err,user) => {
		if (!!err)
			return res.json(err);
		CourseModel.importStudents(req.user._id, ObjectId(cid), students, (err,ret) => {
			access.checkRequest(res, err, ret, "Students addition failed", () => {
				res.json({});
			});
		});
	});
});

router.get('/get/student', access.ajax, (req,res) => {
	let number = req.query["number"];
	let cid = req.query["cid"];
	let error = validator({ _id: cid, students: [{number:number}] }, "Course");
	if (error.length > 0)
		return res.json({errmsg:error});
	CourseEntity.getStudent(ObjectId(cid), number, (err,ret) => {
		access.checkRequest(res, err, ret, "Failed retrieving student", () => {
			res.json({student: ret.students[0]});
		});
	});
});

router.get('/remove/course', access.ajax, access.logged, (req,res) => {
	let cid = req.query["cid"];
	let error = validator({_id:cid}, "Course");
	if (error.length > 0)
		return res.json({errmsg:error});
	CourseModel.remove(req.user._id, ObjectId(cid), (err,ret) => {
		access.checkRequest(res, err, ret, "Course removal failed", () => {
			res.json({});
		});
	});
});

module.exports = router;
