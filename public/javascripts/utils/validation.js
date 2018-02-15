try { var _ = require("underscore"); } catch (err) {} //for server

let Validator = { };

// Cell in evaluation.questions array
Validator.Question = {
	"index": "section", //"2.2.1", "3.2", "1" ...etc
	"wording": "string",
	"options": "stringArray", //only for quiz
	"fixed": "boolean",
	"answer": "string", //both this and next are mutually exclusive
	"choice": "integerArray",
	"active": "boolean",
	"points": "number",
};

Validator.Input = {
	"index": "section",
	"input": "stringOrIntegerArray",
};

// One student response to an exam
Validator.Paper = {
	"number": "code",
	// (array of) strings for open questions, arrays of integers for quizzes:
	"inputs": Validator.Input,
	"startTime": "positiveInteger",
	"endTime": "positiveInteger",
	"discoTime": "positiveInteger",
	"discoCount": "positiveInteger",
	"totalDisco": "positiveInteger",
	"password": "password",
};

Validator.Evaluation = {
	"_id": "bson",
	"cid": "bson",
	"name": "code",
	"mode": "alphanumeric", //"open" or "exam", but alphanumeric is good enough
	"active": "boolean",
	"fixed": "boolean",
	"display": "alphanumeric", //"one" or "all"
	"time": "integer",
	"introduction": "string",
	"coefficient": "number",
	"questions": Validator.Question,
	"papers": Validator.Paper,
};

Validator.User = {
	"_id": "bson",
	"email": "email",
	"name": "name",
	"initials": "unchecked", //not a user input
	"loginToken": "unchecked",
	"sessionTokens": "unchecked",
	"token": "alphanumeric", //exception: for the purpose of user registration
};

Validator.Student = {
	"number": "code",
	"name": "name",
	"group": "positiveInteger",
};

Validator.Course = {
	"_id": "bson",
	"uid": "bson",
	"code": "code",
	"description": "string",
	"password": "hash",
	"students": Validator.Student,
};

Object.assign(Validator,
{
	// Recurse into sub-documents
	checkObject_aux: function(obj, model)
	{
		for (let key of Object.keys(obj))
		{
			if (!model[key])
				return "Unknown field";
			if (model[key] == "unchecked") //not a user input (ignored)
				continue;
			if (_.isObject(model[key]))
			{
				// TODO: next loop seems too heavy... (only a concern if big class import?)
				for (let item of obj[key])
				{
					let error = Validator.checkObject_aux(item, model[key]);
					if (error.length > 0)
						return error;
				}
			}
			else
			{
				let error = Validator[ "check_" + model[key] ](obj[key]);
				if (error.length > 0)
					return key + ": " + error;
			}
		}
		return "";
	},

	// Always check top-level object
	checkObject: function(obj, name)
	{
		return Validator.checkObject_aux(obj, Validator[name]);
	},

	"check_string": function(arg)
	{
		return ""; //strings are unchecked, but sanitized
	},

	"check_section": function(arg)
	{
		if (!_.isString(arg))
			return "not a string";
		if (!/^[0-9.]+$/.test(arg))
			return "digits and dot only";
		return "";
	},

	"check_stringArray": function(arg)
	{
		return !_.isArray(arg) ? "not an array" : "";
	},

	"check_alphanumeric": function(arg)
	{
		return arg.match(/^[\w]{1,32}$/) === null ? "[1,32] alphanumerics" : "";
	},

	"check_bson": function(arg)
	{
		return arg.match(/^[a-z0-9]{24}$/) === null ? "not a BSON id" : "";
	},

	"check_name": function(arg)
	{
		if (!_.isString(arg))
			return "not a string";
		if (!/^[a-zA-Z\u00C0-\u024F -]{1,32}$/.test(arg))
			return "[1,32] letters + hyphen/space";
		return "";
	},

	"check_email": function(arg)
	{
		if (!_.isString(arg))
			return "not a string";
		if (arg.length > 64)
			return "string too long: max. 64 characters";
		// Regexp used in "type='email'" inputs ( http://emailregex.com/ )
		if (!/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(arg))
			return "X@Y, alphanumerics and . _ - +(X)";
		return "";
	},

	"check_code": function(arg)
	{
		if (!_.isString(arg))
			return "not a string";
		if (!/^[\w.-]{1,16}$/.test(arg))
			return "[1,16] alphanumerics and . _ -";
		return "";
	},

	"check_number": function(arg)
	{
		if (!_.isNumber(arg))
			arg = parseFloat(arg);
		if (isNaN(arg))
			return "not a number";
		return "";
	},

	"check_integer": function(arg)
	{
		if (!_.isNumber(arg))
			arg = parseInt(arg);
		if (isNaN(arg) || arg % 1 != 0)
			return "not an integer";
		return "";
	},

	"check_positiveInteger": function(arg)
	{
		return Validator["check_integer"](arg) || (arg<0 ? "not positive" : "");
	},

	"check_boolean": function(arg)
	{
		if (!_.isBoolean(arg))
			return "not a boolean";
		return "";
	},

	"check_password": function(arg)
	{
		if (!_.isString(arg))
			return "not a string";
		if (!/^[\x21-\x7E]{1,16}$/.test(arg))
			return "[1,16] ASCII characters with code in [33,126]";
		return "";
	},

	// Sha-1 hash: length 40, hexadecimal
	"check_hash": function(arg)
	{
		if (!_.isString(arg))
			return "not a string";
		if (!/^[a-f0-9]{40}$/.test(arg))
			return "not a sha-1 hash";
		return "";
	},

	"check_integerArray": function(arg)
	{
		if (!_.isArray(arg))
			return "not an array";
		for (let i=0; i<arg.length; i++)
		{
			let error = Validator["check_integer"](arg[i]);
			if (error.length > 0)
				return error;
		}
		return "";
	},

	"check_stringOrIntegerArray": function(arg)
	{
		if (!_.isString(arg))
			return Validator["check_integerArray"](arg);
		return "";
	},
});

try { module.exports = Validator.checkObject; } catch (err) {} //for server
