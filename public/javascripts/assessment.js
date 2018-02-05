let socket = null; //monitor answers in real time

if (assessment.mode == "secure" && !checkWindowSize())
	document.location.href= "/fullscreen";

function checkWindowSize()
{
	// NOTE: temporarily accept smartphone (security hole: pretend being a smartphone on desktop browser...)
	if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/))
		return true;
	// 3 is arbitrary, but a small tolerance is required (e.g. in Firefox)
	return window.innerWidth >= screen.width-3 && window.innerHeight >= screen.height-3;
};

let V = new Vue({
	el: "#assessment",
	data: {
		assessment: assessment,
		answers: { }, //filled later with answering parameters
		student: { }, //filled later (name, password)
		// Stage 0: unauthenticated (number),
		//       1: authenticated (got a name, unvalidated)
		//       2: locked: password set, exam started
		//       3: completed
		//       4: show answers
		stage: assessment.mode != "open" ? 0 : 1,
		remainingTime: 0, //global, in seconds
		warnMsg: "",
	},
	computed: {
		countdown: function() {
			let seconds = this.remainingTime % 60;
			let minutes = Math.floor(this.remainingTime / 60);
			return this.padWithZero(minutes) + ":" + this.padWithZero(seconds);
		},
		showAnswers: function() {
			return this.stage == 4;
		},
	},
	mounted: function() {
		$(".modal").modal();
		if (assessment.mode != "secure")
			return;
		window.addEventListener("keydown", e => {
			// Ignore F12 (avoid accidental window resize due to devtools)
			// NOTE: in Chromium at least, fullscreen mode exit with F11 cannot be prevented.
			// Workaround: disable key at higher level. Possible xbindkey config:
			// "false"
			//   m:0x10 + c:95
			//   Mod2 + F11
			if (e.keyCode == 123)
				e.preventDefault();
		}, false);
		window.addEventListener("blur", () => {
			this.trySendCurrentAnswer();
			document.location.href= "/noblur";
		}, false);
		window.addEventListener("resize", e => {
			this.trySendCurrentAnswer();
			document.location.href= "/fullscreen";
		}, false);
	},
	methods: {
		// In case of AJAX errors
		showWarning: function(message) {
			this.warnMsg = message;
			$("#warning").modal("open");
		},
		padWithZero: function(x) {
			if (x < 10)
				return "0" + x;
			return x;
		},
		trySendCurrentAnswer: function() {
			if (this.stage == 2)
				this.sendAnswer();
		},
		// stage 0 --> 1
		getStudent: function(cb) {
			$.ajax("/get/student", {
				method: "GET",
				data: {
					number: this.student.number,
					cid: assessment.cid,
				},
				dataType: "json",
				success: s => {
					if (!!s.errmsg)
						return this.showWarning(s.errmsg);
					this.stage = 1;
					this.student = s.student;
					Vue.nextTick( () => { Materialize.updateTextFields(); });
					if (!!cb)
						cb();
				},
			});
		},
		// stage 1 --> 0
		cancelStudent: function() {
			this.stage = 0;
		},
		// stage 1 --> 2 (get all questions, set password)
		startAssessment: function() {
			let initializeStage2 = (questions,paper) => {
				$("#leftButton, #rightButton").hide();
				if (assessment.time > 0)
				{
					const deltaTime = !!paper ? Date.now() - paper.startTime : 0;
					this.remainingTime = assessment.time * 60 - Math.round(deltaTime / 1000);
					this.runTimer();
				}
				// Initialize structured answer(s) based on questions type and nesting (TODO: more general)
				if (!!questions)
					assessment.questions = questions;
				this.answers.inputs = [ ];
				for (let q of assessment.questions)
					this.answers.inputs.push( _(q.options.length).times( _.constant(false) ) );
				if (!paper)
				{
					this.answers.indices = assessment.fixed
						? _.range(assessment.questions.length)
						: _.shuffle( _.range(assessment.questions.length) );
				}
				else
				{
					// Resuming
					let indices = paper.inputs.map( input => { return input.index; });
					let remainingIndices = _.difference( _.range(assessment.questions.length).map(String), indices );
					this.answers.indices = indices.concat( _.shuffle(remainingIndices) );
				}
				this.answers.index = !!paper ? paper.inputs.length : 0;
				this.answers.displayAll = assessment.display == "all";
				this.answers.showSolution = false;
				this.stage = 2;
			};
			if (assessment.mode == "open")
				return initializeStage2();
			$.ajax("/start/assessment", {
				method: "GET",
				data: {
					number: this.student.number,
					aid: assessment._id
				},
				dataType: "json",
				success: s => {
					if (!!s.errmsg)
						return this.showWarning(s.errmsg);
					if (!!s.paper)
					{
						// Resuming: receive stored answers + startTime
						this.student.password = s.paper.password;
						this.answers.inputs = s.paper.inputs.map( inp => { return inp.input; });
					}
					else
					{
						this.student.password = s.password;
						// Got password: students answers locked to this page until potential teacher
						// action (power failure, computer down, ...)
					}
					socket = io.connect("/" + assessment.name, {
						query: "aid=" + assessment._id + "&number=" + this.student.number + "&password=" + this.student.password
					});
					socket.on(message.allAnswers, this.setAnswers);
					initializeStage2(s.questions, s.paper);
				},
			});
		},
		// stage 2
		runTimer: function() {
			if (assessment.time <= 0)
				return;
			let self = this;
			setInterval( function() {
				self.remainingTime--;
				if (self.remainingTime <= 0)
				{
					if (self.stage == 2)
						self.endAssessment();
					clearInterval(this);
				}
			}, 1000);
		},
		// stage 2
		sendOneAnswer: function() {
			const realIndex = this.answers.indices[this.answers.index];
			let gotoNext = () => {
				if (this.answers.index == assessment.questions.length - 1)
					this.endAssessment();
				else
					this.answers.index++;
				this.$children[0].$forceUpdate(); //TODO: bad HACK, and shouldn't be required...
			};
			if (assessment.mode == "open")
				return gotoNext(); //only local
			let answerData = {
				aid: assessment._id,
				answer: JSON.stringify({
					index: realIndex.toString(),
					input: this.answers.inputs[realIndex]
						.map( (tf,i) => { return {val:tf,idx:i}; } )
						.filter( item => { return item.val; })
						.map( item => { return item.idx; })
				}),
				number: this.student.number,
				password: this.student.password,
			};
			$.ajax("/send/answer", {
				method: "GET",
				data: answerData,
				dataType: "json",
				success: ret => {
					if (!!ret.errmsg)
						return this.showWarning(ret.errmsg);
					gotoNext();
					socket.emit(message.newAnswer, answerData);
				},
			});
		},
		// TODO: I don't like that + sending should not be definitive in exam mode with display = all
		sendAnswer: function() {
			if (assessment.display == "one")
				this.sendOneAnswer();
			else
				assessment.questions.forEach(this.sendOneAnswer);
		},
		// stage 2 --> 3 (or 4)
		// from a message by statements component, or time over
		endAssessment: function() {
			// Set endTime, destroy password
			$("#leftButton, #rightButton").show();
			if (assessment.mode == "open")
			{
				this.stage = 4;
				this.answers.showSolution = true;
				return;
			}
			$.ajax("/end/assessment", {
				method: "GET",
				data: {
					aid: assessment._id,
					number: this.student.number,
					password: this.student.password,
				},
				dataType: "json",
				success: ret => {
					if (!!ret.errmsg)
						return this.showWarning(ret.errmsg);
					assessment.conclusion = ret.conclusion;
					this.stage = 3;
					delete this.student["password"]; //unable to send new answers now
					socket.disconnect();
					socket = null;
				},
			});
		},
		// stage 3 --> 4 (on socket message "feedback")
		setAnswers: function(m) {
			for (let i=0; i<m.answers.length; i++)
				assessment.questions[i].answer = m.answers[i];
			this.answers.showSolution = true;
			this.stage = 4;
		},
	},
});
