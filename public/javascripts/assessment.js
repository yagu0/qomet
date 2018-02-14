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
}

new Vue({
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
		remainingTime: assessment.time, //integer or array
		stage: assessment.mode != "open" ? 0 : 1,
		warnMsg: "",
	},
	computed: {
		countdown: function() {
			const remainingTime = assessment.display == "one" && _.isArray(assessment.time)
				? this.remainingTime[this.answers.index]
				: this.remainingTime;
			let seconds = remainingTime % 60;
			let minutes = Math.floor(remainingTime / 60);
			return this.padWithZero(minutes) + ":" + this.padWithZero(seconds);
		},
	},
	mounted: function() {
		$(".modal").modal();
		if (["exam","open"].includes(assessment.mode))
			return;
		window.addEventListener("blur", () => {
			if (this.stage != 2)
				return;
			if (assessment.mode == "secure")
			{
				this.sendAnswer();
				document.location.href= "/noblur";
			}
			else //"watch" mode
				socket.emit(message.studentBlur, {number:this.student.number});
		}, false);
		if (assessment.mode == "watch")
		{
			window.addEventListener("focus", () => {
				if (this.stage != 2)
					return;
				socket.emit(message.studentFocus, {number:this.student.number});
			}, false);
		}
		window.addEventListener("resize", e => {
			if (this.stage != 2)
				return;
			if (assessment.mode == "secure")
			{
				this.sendAnswer();
				document.location.href = "/fullscreen";
			}
			else //"watch" mode
			{
				if (checkWindowSize())
					socket.emit(message.studentFullscreen, {number:this.student.number});
				else
					socket.emit(message.studentResize, {number:this.student.number});
			}
		}, false);
	},
	methods: {
		// In case of AJAX errors (not blur-ing)
		showWarning: function(message) {
			this.warnMsg = message;
			$("#warning").modal("open");
		},
		padWithZero: function(x) {
			if (x < 10)
				return "0" + x;
			return x;
		},
		// stage 0 --> 1
		getStudent: function() {
			$.ajax("/courses/student", {
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
				},
			});
		},
		// stage 1 --> 0
		cancelStudent: function() {
			this.stage = 0;
		},
		// stage 1 --> 2 (get all questions, set password)
		startAssessment: function() {
			let initializeStage2 = paper => {
				$("#leftButton, #rightButton").hide();
				// Initialize structured answer(s) based on questions type and nesting (TODO: more general)
				
				// if display == "all" getQuestionS
				// otherwise get first question
				
				
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







				if (assessment.time > 0)
				{

// TODO: distinguish total exam time AND question time

					const deltaTime = !!paper ? Date.now() - paper.startTime : 0;
					this.remainingTime = assessment.time * 60 - Math.round(deltaTime / 1000);
					this.runTimer();
				}


				this.answers.index = !!paper ? paper.inputs.length : 0;
				this.answers.displayAll = assessment.display == "all";
				this.answers.showSolution = false;
				this.stage = 2;
			};
			if (assessment.mode == "open")
				return initializeStage2();
			$.ajax("/assessments/start", {
				method: "PUT",
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
					socket = io.connect("/", {
						query: "aid=" + assessment._id + "&number=" + this.student.number + "&password=" + this.student.password
					});
					socket.on(message.allAnswers, this.setAnswers);
					initializeStage2(s.questions, s.paper);
				},
			});
		},


		// stage 2
		runGlobalTimer: function() {
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
		runQuestionTimer: function(idx) {
			if (assessment.questions[idx].time <= 0)
				return;
			let self = this; //TODO: question remaining time
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

//TODO: get question after sending answer

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
			$.ajax("/assessments/answer", {
				method: "PUT",
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
				this.answers.displayAll = true;
				return;
			}
			$.ajax("/assessments/end", {
				method: "PUT",
				data: {
					aid: assessment._id,
					number: this.student.number,
					password: this.student.password,
				},
				dataType: "json",
				success: ret => {
					if (!!ret.errmsg)
						return this.showWarning(ret.errmsg);
					this.stage = 3;
					delete this.student["password"]; //unable to send new answers now
				},
			});
		},
		// stage 3 --> 4 (on socket message "feedback")
		setAnswers: function(m) {
			const answers = JSON.parse(m.answers);
			for (let i=0; i<answers.length; i++)
				assessment.questions[i].answer = answers[i];
			this.answers.showSolution = true;
			this.answers.displayAll = true;
			this.stage = 4;
			socket.disconnect();
			socket = null;
		},
	},
});
