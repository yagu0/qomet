// Socket message list, easier life in case of a message renaming

let message = {
	// send answer (student --> server --> monitor)
	newAnswer: "new answer",
	// receive all answers to an exam (server --> student)
	allAnswers: "all answers",
};

try { module.exports = message; } catch (err) {} //for server
