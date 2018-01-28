// TODO: if display == "all", les envois devraient être non définitifs (possibilité de corriger)
// Et, blur sur une (sous-)question devrait envoyer la version courante de la sous-question

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

new Vue({
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
		warnMsg: "",
	},
	components: {
		"statements": {
			props: ['assessment','inputs','student','stage'],
			// TODO: general render function for nested exercises
			// TODO: with answer if stage==4 : class "wrong" if ticked AND stage==4 AND received answers
			// class "right" if stage == 4 AND received answers (background-color: red / green)
			// There should be a questions navigator below, or next (visible if display=='all')
			// Full questions tree is rendered, but some parts hidden depending on display settings
			render(h) {
				let self = this;
				let questions = (assessment.questions || [ ]).map( (q,i) => {
					let questionContent = [ ];
					questionContent.push(
						h(
							"div",
							{
								"class": {
									wording: true,
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
										checked: this.inputs.length > 0 && this.inputs[i][idx],
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
								"hide": this.stage == 2 && assessment.display == 'one' && assessment.indices[assessment.index] != i,
							},
						},
						questionContent
					);
				});
				if (this.stage == 2)
				{
					questions.unshift(
						h(
							"button",
							{
								"class": {
									"waves-effect": true,
									"waves-light": true,
									"btn": true,
								},
								style: {
									"display": "block",
									"margin-left": "auto",
									"margin-right": "auto",
								},
								on: {
									click: () => this.sendAnswer(assessment.indices[assessment.index]),
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
			mounted: function() {
				if (assessment.mode != "secure")
					return;
				window.addEventListener("keydown", e => {
					// (Try to) Ignore F11 + F12 (avoid accidental window resize)
					// NOTE: in Chromium at least, exiting fullscreen mode with F11 cannot be prevented.
					// Workaround: disable key at higher level. Possible xbindkey config:
					// "false"
					//   m:0x10 + c:95
					//   Mod2 + F11
					if ([122,123].includes(e.keyCode))
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
				inputId: function(i,j) {
					return "q" + i + "_" + "input" + j;
				},
				trySendCurrentAnswer: function() {
					if (this.stage == 2)
						this.sendAnswer(assessment.indices[assessment.index]);
				},
				// stage 2
				sendAnswer: function(realIndex) {
					console.log(realIndex);
					if (assessment.index == assessment.questions.length - 1)
						this.$emit("gameover");
					else
						assessment.index++;
					this.$forceUpdate(); //TODO: shouldn't be required
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
								return this.$emit("warning", ret.errmsg);
							//socket.emit(message.newAnswer, answer);
						},
					});
				},
			},
		},
	},
	computed: {
		countdown: function() {
			let seconds = this.remainingTime % 60;
			let minutes = Math.floor(this.remainingTime / 60);
			return this.padWithZero(minutes) + ":" + this.padWithZero(seconds);
		},
	},
	mounted: function() {
		$(".modal").modal();
	},
	methods: {
		// In case of AJAX errors
		warning: function(message) {
			this.warnMsg = message;
			$("#warning").modal("open");
		},
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
						return this.warning(s.errmsg);
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
					this.remainingTime = assessment.time * 60 - (!!paper ? paper.startTime/1000 : 0);
					this.runTimer();
				}
				// Initialize structured answer(s) based on questions type and nesting (TODO: more general)
				if (!!questions)
					assessment.questions = questions;
				for (let q of assessment.questions)
					this.inputs.push( _(q.options.length).times( _.constant(false) ) );
				if (!paper)
				{
					assessment.indices = assessment.fixed
						? _.range(assessment.questions.length)
						: _.shuffle( _.range(assessment.questions.length) );
				}
				else
				{
					// Resuming
					let indices = paper.inputs.map( input => { return input.index; });
					let remainingIndices = _.difference(_.range(assessment.questions.length), indices);
					assessment.indices = indices.concat( _.shuffle(remainingIndices) );
				}
				assessment.index = !!paper ? paper.inputs.length : 0;
				this.stage = 2;
				Vue.nextTick( () => {
					// Run Prism + MathJax on questions text
					$("#statements").find("code[class^=language-]").each( (i,elem) => {
						Prism.highlightElement(elem);
					});
					MathJax.Hub.Queue(["Typeset",MathJax.Hub,"statements"]);
				});
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
						return this.warning(s.errmsg);
					if (!!s.paper)
					{
						// Resuming: receive stored answers + startTime
						this.student.password = s.paper.password;
						this.inputs = s.paper.inputs.map( inp => { return inp.input; });
					}
					else
					{
						this.student.password = s.password;
						// Got password: students answers locked to this page until potential teacher
						// action (power failure, computer down, ...)
					}
					// TODO: password also exchanged by sockets to check identity
					//socket = io.connect("/" + assessment.name, {
					//	query: "number=" + this.student.number + "&password=" + this.password
					//});
					//socket.on(message.allAnswers, this.setAnswers);
					//socket.on("disconnect", () => { }); //TODO: notify monitor (highlight red), redirect
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
				if (self.remainingTime <= 0 || self.stage >= 4)
					self.endAssessment();
					clearInterval(this);
			}, 1000);
		},
		// stage 2 --> 3 (or 4)
		// from a message by statements component, or time over
		endAssessment: function() {
			// Set endTime, destroy password
			$("#leftButton, #rightButton").show();
			if (assessment.mode == "open")
			{
				this.stage = 4;
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
						return this.warning(ret.errmsg);
					assessment.conclusion = ret.conclusion;
					this.stage = 3;
					delete this.student["password"]; //unable to send new answers now
					//socket.disconnect();
					//socket = null;
				},
			});
		},
		// stage 3 --> 4 (on socket message "feedback")
		setAnswers: function(answers) {
			for (let i=0; i<answers.length; i++)
				assessment.questions[i].answer = answers[i];
			this.stage = 4;
		},
	},
});
