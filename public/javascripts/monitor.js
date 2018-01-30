// TODO: onglets pour chaque groupe + section déroulante questionnaire (chargé avec réponses)
//   NOM Prenom (par grp, puis alphabétique)
//   réponse : vert si OK (+ choix), rouge si faux, gris si texte (clic pour voir)
//   + temps total ?
//   click sur en-tête de colonne : tri alphabétique, tri décroissant...
// Affiché si (hash du) mdp du cours est correctement entré
// Doit reprendre les données en base si refresh (sinon : sockets)

// Also buttons "start exam", "end exam" for logged in teacher

let socket = null; //monitor answers in real time

new Vue({
	el: "#monitor",
	data: {
		password: "", //from password field
		assessment: null, //obtained after authentication
		// Stage 0: unauthenticated (password),
		//       1: authenticated (password hash validated), start monitoring
		stage: 0,
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
