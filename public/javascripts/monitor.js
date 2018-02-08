let socket = null; //monitor answers in real time

new Vue({
	el: "#monitor",
	data: {
		password: "", //from password field
		assessment: { }, //obtained after authentication
		// Stage 0: unauthenticated (password),
		//       1: authenticated (password hash validated), start monitoring
		stage: 0,
		answers: {
			displayAll: true,
			showSolution: true, //TODO: allow to hide, to let teachers search too
			inputs: [ ],
			index : -1,
		},
		students: [ ], //to know their names
		display: "assessment", //or student's answers
	},
	methods: {
		// TODO: redundant code, next 4 funcs already exist in course.js
		toggleDisplay: function(area) {
			if (this.display == area)
				this.display = "";
			else
				this.display = area;
		},
		studentList: function(group) {
			return this.students
				.filter( s => { return group==0 || s.group == group; })
				.map( s => { return Object.assign({}, s); }) //not altering initial array
				.sort( (a,b) => {
					let res = a.name.localeCompare(b.name);
					if (res == 0)
						res += a.forename.localeCompare(b.forename);
					return res;
				});
		},
		groupList: function() {
			let maxGrp = 1;
			this.students.forEach( s => {
				if (s.group > maxGrp)
					maxGrp = s.group;
			});
			return _.range(1,maxGrp+1);
		},
		groupId: function(group, prefix) {
			return (prefix || "") + "group" + group;
		},
		getColor: function(number, qIdx) {
			// For the moment, green if correct and red if wrong; grey if unanswered yet
			// TODO: in-between color for partially right (especially for multi-questions)
			const paperIdx = this.assessment.papers.findIndex( item => { return item.number == number; });
			if (paperIdx === -1)
				return "grey"; //student didn't start yet
			const inputIdx = this.assessment.papers[paperIdx].inputs.findIndex( item => {
				const qNum = parseInt(item.index.split(".")[0]); //indexes separated by dots
				return qIdx == qNum;
			});
			if (inputIdx === -1)
				return "grey";
			if (_.isEqual(this.assessment.papers[paperIdx].inputs[inputIdx].input, this.assessment.questions[qIdx].answer))
				return "green";
			return "red";
		},
		seeDetails: function(number, i) {
			// UNIMPLEMENTED: see question details, with current answer(s)
		},
		// stage 0 --> 1
		startMonitoring: function() {
			$.ajax("/start/monitoring", {
				method: "GET",
				data: {
					password: Sha1.Compute(this.password),
					aname: examName,
					ccode: courseCode,
					initials: initials,
				},
				dataType: "json",
				success: s => {
					if (!!s.errmsg)
						return alert(s.errmsg);
					this.assessment = s.assessment;
					this.answers.inputs = s.assessment.questions.map( q => {
						let input = _(q.options.length).times( _.constant(false) );
						q.answer.forEach( idx => { input[idx] = true; });
						return input;
					});
					this.students = s.students;
					this.stage = 1;
					socket = io.connect("/", {
						query: "aid=" + this.assessment._id + "&secret=" + s.secret
					});
					socket.on(message.newAnswer, m => {
						let paperIdx = this.assessment.papers.findIndex( item => {
							return item.number == m.number;
						});
						if (paperIdx === -1)
						{
							// First answer
							paperIdx = this.assessment.papers.length;
							this.assessment.papers.push({
								number: m.number,
								inputs: [ ], //other fields irrelevant here
							});
						}
						// TODO: notations not coherent (input / answer... when, which ?)
						this.assessment.papers[paperIdx].inputs.push(JSON.parse(m.answer)); //input+index
					});
				},
			});
		},
		endMonitoring: function() {
			// In the end, send answers to students
			socket.emit(
				message.allAnswers,
				{ answers: JSON.stringify(this.assessment.questions.map( q => { return q.answer; })) }
			);
		},
	},
});
