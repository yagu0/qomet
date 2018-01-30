// UNIMPLEMENTED

// TODO: onglets pour chaque groupe + section déroulante questionnaire (chargé avec réponses)
//   NOM Prenom (par grp, puis alphabétique)
//   réponse : vert si OK (+ choix), rouge si faux, gris si texte (clic pour voir)
//   + temps total ?
//   click sur en-tête de colonne : tri alphabétique, tri décroissant...
// Affiché si (hash du) mdp du cours est correctement entré
// Doit reprendre les données en base si refresh (sinon : sockets)

// Also buttons "start exam", "end exam" for logged in teacher

// TODO: réutiliser le component... trouver un moyen

let socket = null; //monitor answers in real time

function libsRefresh()
{
	// Run Prism + MathJax on questions text
	$("#statements").find("code[class^=language-]").each( (i,elem) => {
		Prism.highlightElement(elem);
	});
	MathJax.Hub.Queue(["Typeset",MathJax.Hub,"statements"]);
}

new Vue({
	el: "#monitor",
	data: {
		password: "", //from password field
		assessment: null, //obtained after authentication
		// Stage 0: unauthenticated (password),
		//       1: authenticated (password hash validated), start monitoring
		stage: 0,
	},
	components: {
		"statements": {
			props: ['assessment','inputs','student','stage'],
			// TODO: general render function for nested exercises
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
				libsRefresh();
			},
			methods: {
				inputId: function(i,j) {
					return "q" + i + "_" + "input" + j;
				},
			},
		},
	},
	methods: {
		// stage 0 --> 1
		startMonitoring: function() {
			$.ajax("/start/monitoring", {
				method: "GET",
				data: {
					password: this.,
					aname: examName,
					cname: courseName,
				},
				dataType: "json",
				success: s => {
					if (!!s.errmsg)
						return this.warning(s.errmsg);
					this.stage = 1;
				},
			});
		},
		// TODO: 2-level sockets, for prof and monitors
					socket = io.connect("/" + assessment.name, {
						query: "number=" + this.student.number + "&password=" + this.password
					});
					socket.on(message.allAnswers, this.setAnswers);
					initializeStage2(s.questions, s.paper);
				},
			});
		},
		// stage 2 --> 3 (or 4)
		// from a message by statements component, or time over
		// TODO: also function startAssessment (for main teacher only)
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
					socket.disconnect();
					socket = null;
				},
			});
		},
	},
});
