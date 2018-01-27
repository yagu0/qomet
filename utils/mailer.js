const params = require("../config/parameters");
const { exec } = require('child_process');

let Mailer =
{
	// o: {from(*), to(*), subject, body} - (*): mandatory
	send: function(o, callback)
	{
		let from = o.from;
		let to = o.to;
		let subject = !!o.subject ? o.subject : "[No subject]";
		let body = !!o.body ? o.body : "";

		// In development mode, just log message:
		let env = process.env.NODE_ENV || 'development';
		if ('development' === env)
		{
			console.log("New mail: from " + from + " / to " + to);
			console.log("Subject: " + subject);
			let msgText = body.split('\\n');
			msgText.forEach(msg => { console.log(msg); });
			callback({});
		}
		else
		{
			exec(
				"printf 'From: " + from + "\n" +
					"To: " + to + "\n" +
					"Subject: " + subject + "\n" +
					body + "' | msmtp -a " + params.mail.account + " " + to,
				(err, stdout, stderr) => {
					callback(err);
					// the *entire* stdout and stderr (buffered)
					//console.log("stdout: " + stdout);
					//console.log("stderr: " + stderr);
				}
			);
		}
	}
};

module.exports = Mailer;
