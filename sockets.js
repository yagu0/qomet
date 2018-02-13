const message = require("./public/javascripts/utils/socketMessages");
const params = require("./config/parameters");
const AssessmentModel = require("./models/assessment");
const ObjectId = require("bson-objectid");

module.exports = function(io)
{
	io.of("/").on("connection", socket => { //student or monitor connexion
		const aid = socket.handshake.query.aid;
		const isTeacher = !!socket.handshake.query.secret && socket.handshake.query.secret == params.secret;

		if (isTeacher)
		{
			socket.join(aid + "_teacher");
			socket.on(message.allAnswers, m => { //send feedback to student (answers)
				socket.broadcast.to(aid + "_student").emit(message.allAnswers, m);
			});
		}
		else //student
		{
			const number = socket.handshake.query.number;
			const password = socket.handshake.query.password;
			AssessmentModel.checkPassword(ObjectId(aid), number, password, (err,ret) => {
				if (!!err || !ret)
					return; //wrong password, or some unexpected error...
				AssessmentModel.newConnection(ObjectId(aid), number);
				socket.broadcast.to(aid + "_teacher").emit(message.studentConnect, {number: number});
				socket.join(aid + "_student");
				socket.on(message.newAnswer, m => { //got answer from student client
					socket.broadcast.to(aid + "_teacher").emit(message.newAnswer, m);
				});
				socket.on(message.studentBlur, m => {
					socket.broadcast.to(aid + "_teacher").emit(message.studentBlur, m);
				});
				socket.on(message.studentFocus, m => {
					socket.broadcast.to(aid + "_teacher").emit(message.studentFocus, m);
				});
				socket.on(message.studentResize, m => {
					socket.broadcast.to(aid + "_teacher").emit(message.studentResize, m);
				});
				socket.on(message.studentFullscreen, m => {
					socket.broadcast.to(aid + "_teacher").emit(message.studentFullscreen, m);
				});
				socket.on("disconnect", () => { //notify monitor + server
					AssessmentModel.setDiscoTime(ObjectId(aid), number);
					socket.broadcast.to(aid + "_teacher").emit(message.studentDisconnect, {number: number});
				});
			});
		}
	});
}
