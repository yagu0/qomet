const message = require("./public/javascripts/utils/socketMessages");
const params = require("./config/parameters");
const AssessmentEntity = require("./entities/assessment");
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
				if (!!students[m.number]) //TODO: namespace here... room quiz
					socket.broadcast.to(aid).emit(message.allAnswers, m);
			});
		}
		else //student
		{
			const number = socket.handshake.query.number;
			const password = socket.handshake.query.password;
			AssessmentEntity.checkPassword(ObjectId(aid), number, password, (err,ret) => {
				if (!!err || !ret)
					return; //wrong password, or some unexpected error...
				// TODO: Prevent socket connection (just ignore) if student already connected
//				io.of('/').in(aid).clients((error, clients) => {
//					if (error)
//						throw error;
//					if (clients.some( c => { return c. .. == number; }))
//						// Problem: we just have a list of socket IDs (not handshakes)
//				});
				// TODO: next is conditional to "student not already taking the exam"
				socket.on(message.allAnswers, () => { //got all answers from teacher
					socket.emit(message.allAnswers, m);
				});
				socket.on("disconnect", () => {
					//TODO: notify monitor (grey low opacity background)
					//Also send to server: discoTime in assessment.papers ...
				});
			});
		}
	});
}
