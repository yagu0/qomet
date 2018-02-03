// TODO: onglets pour chaque groupe + section déroulante questionnaire (chargé avec réponses)
//   NOM Prenom (par grp, puis alphabétique)
//   réponse : vert si OK (+ choix), rouge si faux, gris si texte (clic pour voir)
//   + temps total ?
//   click sur en-tête de colonne : tri alphabétique, tri décroissant...
// Affiché si (hash du) mdp du cours est correctement entré
// Doit reprendre les données en base si refresh (sinon : sockets)

let socket = null; //monitor answers in real time

new Vue({
	el: "#monitor",
	data: {
		password: "", //from password field
		assessment: null, //obtained after authentication
		// Stage 0: unauthenticated (password),
		//       1: authenticated (password hash validated), start monitoring
		stage: 0,
		answers: {
			displayAll: true,
			showSolution: true, //TODO: allow to hide, to let teachers search too
			inputs: [ ],
			index : -1,
		},
	},
	methods: {
		// stage 0 --> 1
		startMonitoring: function() {
			$.ajax("/start/monitoring", {
				method: "GET",
				data: {
					password: this.password,
					aname: examName,
					cname: courseName,
					initials: initials,
				},
				dataType: "json",
				success: s => {
					if (!!s.errmsg)
						return this.warning(s.errmsg);
					this.assessment = JSON.parse(s.assessment);
					this.stage = 1;
					socket = io.connect("/", {
						query: "aid=" + this.assessment._id + "&secret=" + s.secret
					});
					socket.on(message.newAnswer, m => {
						let paperIdx = this.assessment.papers.findIndex( item => {
							return item.number == m.number;
						});
						this.assessment.papers[paperIdx].inputs.push(m.input); //answer+index
					});
				},
			});
		},
	},
});
