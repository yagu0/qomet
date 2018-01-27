let socket = null; //monitor answers in real time

function checkWindowSize()
{
	if (assessment.mode == "secure")
	{
		// NOTE: temporarily accept smartphone (security hole: pretend being a smartphone on desktop browser...)
		if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/))
			return true;
		let test = () => {
			return window.innerWidth < screen.width || window.innerHeight < screen.height;
		};
		const returnVal = test;
		while (!test)
			alert("Please enter fullscreen mode (F11)");
		return returnVal;
	}
	return true;
};

function libsRefresh()
{
	$("#statements").find("code[class^=language-]").each( (i,elem) => {
		Prism.highlightElement(elem);
	});
	MathJax.Hub.Queue(["Typeset",MathJax.Hub,"statements"]);
};

// TODO: if display == "all", les envois devraient être non définitifs (possibilité de corriger)
// Et, blur sur une (sous-)question devrait envoyer la version courante de la sous-question

let V = new Vue({
	el: "#assessment",
	data: {
		assessment: assessment,
		inputs: [ ], //student's answers
		student: { }, //filled later
		// Stage 0: unauthenticated (number),
		//       1: authenticated (got a name, unvalidated)
		//       2: locked: password set, exam started
		//       3: completed
		//       4: show answers
		stage: assessment.mode != "open" ? 0 : 1,
		remainingTime: 0, //global, in seconds
	},
	components: {
		"statements": {
			props: ['assessment','inputs','student','stage'],
			data: function() {
				return {
					index: 0, //current question index in assessment.indices
				};
			},
			mounted: function() {
				if (assessment.mode != "secure")
					return;
				$("#warning").modal({
					complete: () => {
						this.stage = 2;
						this.resumeAssessment();
					},
				});
				window.addEventListener("blur", () => {
					if (this.stage == 2)
						this.showWarning();
				}, false);
				window.addEventListener("resize", e => {
					if (this.stage == 2 && !checkWindowSize())
						this.showWarning();
				}, false);
				//socket.on("disconnect", () => { }); //TODO: notify monitor (highlight red)
			},
			updated: function() {
				libsRefresh();
			},
			// TODO: general render function for nested exercises
			// TODO: with answer if stage==4 : class "wrong" if ticked AND stage==4 AND received answers
			// class "right" if stage == 4 AND received answers (background-color: red / green)
			// There should be a questions navigator below, or next (visible if display=='all')
			// Full questions tree is rendered, but some parts hidden depending on display settings
			render(h) {
				let self = this;
				let questions = assessment.questions.map( (q,i) => {
					let questionContent = [ ];
					questionContent.push(
						h(
							"div",
							{
								"class": {
									"wording": true,
								},
								domProps: {
									innerHTML: q.wording,
								},
							}
						)
					);
					let optionsOrder = _.range(q.options.length);
					if (!q.fixed)
						optionsOrder = _.shuffle(optionsOrder);
					let optionList = [ ];
					optionsOrder.forEach( idx => {
						let option = [ ];
						option.push(
							h(
								"input",
								{
									domProps: {
										checked: this.inputs[i][idx],
									},
									attrs: {
										id: this.inputId(i,idx),
										type: "checkbox",
									},
									on: {
										change: e => { this.inputs[i][idx] = e.target.checked; },
									},
								},
							)
						);
						option.push(
							h(
								"label",
								{
									domProps: {
										innerHTML: q.options[idx],
									},
									attrs: {
										"for": this.inputId(i,idx),
									},
								}
							)
						);
						optionList.push(
							h(
								"div",
								{
									"class": {
										option: true,
										choiceCorrect: this.stage == 4 && assessment.questions[i].answer.includes(idx),
										choiceWrong: this.stage == 4 && this.inputs[i][idx] && !assessment.questions[i].answer.includes(idx),
									},
								},
								option
							)
						);
					});
					questionContent.push(
						h(
							"div",
							{
								"class": {
									optionList: true,
								},
							},
							optionList
						)
					);
					return h(
						"div",
						{
							"class": {
								"question": true,
								"hide": this.stage == 2 && assessment.display == 'one' && assessment.indices[this.index] != i,
							},
						},
						questionContent
					);
				});
				if (this.stage == 2)
				{
					// TODO: one button per question
					questions.unshift(
						h(
							"button",
							{
								"class": {
									"waves-effect": true,
									"waves-light": true,
									"btn": true,
								},
								on: {
									click: () => this.sendAnswer(assessment.indices[this.index]),
								},
							},
							"Send"
						)
					);
				}
				return h(
					"div",
					{
						attrs: {
							id: "statements",
						},
					},
					questions
				);
			},
			methods: {
				// HELPERS:
				inputId: function(i,j) {
					return "q" + i + "_" + "input" + j;
				},
				showWarning: function(action) {
					this.sendAnswer(assessment.indices[this.index]);
					this.stage = 32; //fictive stage to hide all elements
					$("#warning").modal('open');
				},
				// stage 2
				sendAnswer: function(realIndex) {
					if (this.index == assessment.questions.length - 1)
						this.$emit("gameover");
					else
						this.index++;
					if (assessment.mode == "open")
						return; //only local
					let answerData = {
						aid: assessment._id,
						answer: JSON.stringify({
							index:realIndex.toString(),
							input:this.inputs[realIndex]
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
								return alert(ret.errmsg);
							//socket.emit(message.newAnswer, answer);
						},
					});
				},
				// stage 2 after blur or resize
				resumeAssessment: function() {
					checkWindowSize();
				},
			},
		},
	},
	mounted: function() {
		window.addEventListener("keydown", e => {
			// If F12 or ctrl+shift (ways to access devtools)
			if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey))
				e.preventDefault();
		}, false);
		// Devtools detect based on https://jsfiddle.net/ebhjxfwv/4/
		let div = document.createElement('div');
		let devtoolsLoop = setInterval(
			() => {
				if (assessment.mode != "open")
				{
					console.log(div);
					console.clear();
				}
			},
			1000
		);
		Object.defineProperty(div, "id", {
			get: () => {
				clearInterval(devtoolsLoop);
				if (assessment.mode != "open")
				{
					if (this.stage == 2)
						this.endAssessment();
					document.location.href = "/nodevtools";
				}
			}
		});
	},
	computed: {
		countdown: function() {
			let seconds = this.remainingTime % 60;
			let minutes = Math.floor(this.remainingTime / 60);
			return this.padWithZero(minutes) + ":" + this.padWithZero(seconds);
		},
	},
	methods: {
		// HELPERS:
		padWithZero: function(x) {
			if (x < 10)
				return "0" + x;
			return x;
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
						return alert(s.errmsg);
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
			checkWindowSize();
			let initializeStage2 = questions => {
				$("#leftButton, #rightButton").hide();
				if (assessment.time > 0)
				{
					this.remainingTime = assessment.time * 60;
					this.runTimer();
				}
				// Initialize structured answer(s) based on questions type and nesting (TODO: more general)
				if (!!questions)
					assessment.questions = questions;
				for (let q of assessment.questions)
					this.inputs.push( _(q.options.length).times( _.constant(false) ) );
				assessment.indices = assessment.fixed
					? _.range(assessment.questions.length)
					: _.shuffle( _.range(assessment.questions.length) );
				this.stage = 2;
				Vue.nextTick( () => { libsRefresh(); });
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
						return alert(s.errmsg);
					this.student.password = s.password;
					// Got password: students answers locked to this page until potential teacher
					// action (power failure, computer down, ...)
					// TODO: password also exchanged by sockets to check identity
					//socket = io.connect("/" + assessment.name, {
					//	query: "number=" + this.student.number + "&password=" + this.password
					//});
					//socket.on(message.allAnswers, this.setAnswers);
					initializeStage2(s.questions);
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
				if (self.remainingTime <= 0 || self.stage >= 4)
					self.endAssessment();
					clearInterval(this);
			}, 1000);
		},
		// stage 2 after disconnect (socket)
		resumeAssessment: function() {
			// UNIMPLEMENTED
			// TODO: get stored answers (papers[number cookie]), inject (inputs), set index+indices
		},
		// stage 2 --> 3 (or 4)
		// from a message by statements component
		endAssessment: function() {
			// If time over or cheating: set endTime, destroy password
			$("#leftButton, #rightButton").show();
			//this.sendAnswer(...); //TODO: for each non-answered (and non-empty!) index (yet)
			if (assessment.mode != "open")
			{
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
							return alert(ret.errmsg);
						assessment.conclusion = ret.conclusion;
						this.stage = 3;
						delete this.student["password"]; //unable to send new answers now
						//socket.disconnect();
						//socket = null;
					},
				});
			}
			else
				this.stage = 4;
		},
		// stage 3 --> 4 (on socket message "feedback")
		setAnswers: function(answers) {
			for (let i=0; i<answers.length; i++)
				assessment.questions[i].answer = answers[i];
			this.stage = 4;
		},
	},
});
