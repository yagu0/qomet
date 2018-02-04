const message = require("./public/javascripts/utils/socketMessages");
const params = require("./config/parameters");
const AssessmentModel = require("./models/assessment");
const ObjectId = require("bson-objectid");

module.exports = function(io)
{
	io.of("/").on("connection", socket => {
		const aid = socket.handshake.query.aid;
		socket.join(aid);
		// Student or monitor connexion
		const isTeacher = !!socket.handshake.query.secret && socket.handshake.query.secret == params.secret;

		if (isTeacher)
		{
			socket.on(message.newAnswer, m => { //got answer from student
				socket.emit(message.newAnswer, m);
			});
			socket.on(message.allAnswers, m => { //send feedback to student (answers)
				socket.broadcast.to(aid).emit(message.allAnswers, m);
			});
		}
		else //student
		{
			const number = socket.handshake.query.number;
			const password = socket.handshake.query.password;
			AssessmentModel.checkPassword(ObjectId(aid), number, password, (err,ret) => {
				if (!!err || !ret)
					return; //wrong password, or some unexpected error...
				socket.on("disconnect", () => {
					//TODO: notify monitor (grey low opacity background)
					//Also send to server: discoTime in assessment.papers ...
				});
			});
		}
	});
}
