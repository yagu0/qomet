var message = require("./public/javascripts/utils/socketMessages.js");
const params = require("./config/parameters");

// TODO: when teacher connect on monitor, io.of("appropriate namespace").on(connect student) { ... }
// --> 2 sockets on monitoring page: one with ns "/" et one dedicated to the exam, triggered after the first
// --> The monitoring page should not be closed during exam (otherwise monitors won't receive any more data)

function quizzRoom(socket) {
	let students = { };

	// Student or monitor stuff
	const isTeacher = !!socket.handshake.query.secret && socket.handshake.query.secret == params.secret;

	if (isTeacher)
	{
		// TODO: on student disconnect, too
		socket.on(message.newAnswer, m => { //got answer from student
			socket.emit(message.newAnswer, m);
		});
		socket.on(message.socketFeedback, m => { //send feedback to student (answers)
			if (!!students[m.number])
				socket.broadcast.to(students[m.number]).emit(message.newFeedback, { feedback:m.feedback });
		});
		socket.on("disconnect", m => {
			// Reset student array if no more active teacher connections (TODO: condition)
			students = { };
		});
	}

	else //student
	{
		const number = socket.handshake.query.number;
		const password = socket.handshake.query.password;
		// Prevent socket connection (just ignore) if student already connected
		if (!!students[number] && students[number].password != password)
			return;
		students[number] = {
			sid: socket.id,
			password: password,
		};
		socket.on(message.newFeedback, () => { //got feedback from teacher
			socket.emit(message.newFeedback, m);
		});
		// NOTE: nothing on disconnect --> teacher disconnect trigger students cleaning
	}
}

module.exports = function(io) {

	// NOTE: if prof connected with 2 tabs and close 1, quizz should not break, thus following counter
	let namespaces = { };

	io.of("/").on("connection", socketProf => {
		function closeQuizz(fullPath) {
			namespaces[fullPath].counter--;
			if (namespaces[fullPath].counter == 0)
			{
				// https://stackoverflow.com/questions/26400595/socket-io-how-do-i-remove-a-namespace
				const connectedSockets = Object.keys(namespaces[fullPath].nsp.connected);
				connectedSockets.forEach( sid => {
					namespaces[fullPath].nsp.connected[sid].disconnect();
				});
				namespaces[fullPath].nsp.removeAllListeners();
				delete io.nsps[fullPath];
			}
		}
		// Only prof account can connect default namespace
		socketProf.on(message.startQuizz, m => {
			// m contient quizz ID + fullPath (initials+path+name)
			const quizzNamespace = io.of(m.fullPath);
			if (!namespaces[m.fullPath])
			{
				namespaces[m.fullPath] = { nsp:quizzNamespace, counter:1 };
				quizzNamespace.on("connection", quizzRoom); //après ça : prof can connect in quizz too
				socketProf.emit(message.quizzReady);
				socketProf.on(message.endQuizz, m2 => {
					closeQuizz(m.fullPath);
				});
				socketProf.on("disconnect", m2 => {
					closeQuizz(m.fullPath); //TODO: this should delete all students in array
				});
			}
			else
				namespaces[m.fullPath]++;
		});
	});
}
