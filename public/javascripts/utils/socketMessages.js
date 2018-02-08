// Socket message list, easier life in case of a message renaming

let message = {
	// Send answer (student --> server --> monitor)
	newAnswer: "new answer",
	// Receive all answers to an exam (monitor --> server --> student)
	allAnswers: "all answers",
	// Next 2 to monitor students disconnections
	studentConnect: "student connect",
	studentDisconnect: "student disconnect",
};

try { module.exports = message; } catch (err) {} //for server
