let socket = null; //monitor answers in real time

new Vue({
	el: "#monitor",
	data: {
		password: "", //from password field
		evaluation: { }, //obtained after authentication
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
		display: "evaluation", //or student's answers
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
				.sort( (a,b) => { return a.name.localeCompare(b.name); });
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
		togglePresence: function(student) {
			const sIdx = this.students.findIndex( s => { return s.number == student.number; });
			Vue.set( this.students, sIdx, Object.assign({},student,{present:!student.present}) );
			//s.present = !s.present;
		},
		allFinished: function() {
			for (s of this.students)
			{
				if (!s.present)
					continue;
				const paperIdx = this.evaluation.papers.findIndex( item => { return item.number == s.number; });
				if (paperIdx === -1)
					return false;
				const paper = this.evaluation.papers[paperIdx];
				if (paper.inputs.length < this.evaluation.questions.length)
					return false;
			}
			return true;
		},
		getColor: function(number, qIdx) {
			// For the moment, green if correct and red if wrong; grey if unanswered yet
			// TODO: in-between color for partially right (especially for multi-questions)
			const paperIdx = this.evaluation.papers.findIndex( item => { return item.number == number; });
			if (paperIdx === -1)
				return "grey"; //student didn't start yet
			const inputIdx = this.evaluation.papers[paperIdx].inputs.findIndex( item => {
				const qNum = parseInt(item.index.split(".")[0]); //indexes separated by dots
				return qIdx == qNum;
			});
			if (inputIdx === -1)
				return "grey";
			if (_.isEqual(this.evaluation.papers[paperIdx].inputs[inputIdx].input, this.evaluation.questions[qIdx].answer))
				return "green";
			return "red";
		},
		seeDetails: function(number, i) {
			// UNIMPLEMENTED: see question details, with current answer(s)
		},
		// stage 0 --> 1
		startMonitoring: function() {
			$.ajax("/evaluations/monitor", {
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
					this.evaluation = s.evaluation;
					this.answers.inputs = s.evaluation.questions.map( q => {
						let input = _(q.options.length).times( _.constant(false) );
						q.answer.forEach( idx => { input[idx] = true; });
						return input;
					});
					this.students = s.students;
					this.students.forEach( s => { s.present = true; }); //a priori...
					this.stage = 1;
					socket = io.connect("/", {
						query: "aid=" + this.evaluation._id + "&secret=" + s.secret
					});
					socket.on(message.studentBlur, m => {
						const sIdx = this.students.findIndex( item => { return item.number == m.number; });
						Vue.set(this.students, sIdx, Object.assign({},this.students[sIdx],{blur: true}));
						//this.students[sIdx].blur = true;
					});
					socket.on(message.studentFocus, m => {
						const sIdx = this.students.findIndex( item => { return item.number == m.number; });
						this.students[sIdx].blur = false;
					});
					socket.on(message.studentResize, m => {
						const sIdx = this.students.findIndex( item => { return item.number == m.number; });
						Vue.set(this.students, sIdx, Object.assign({},this.students[sIdx],{resize: true}));
						//this.students[sIdx].resize = true;
					});
					socket.on(message.studentFullscreen, m => {
						const sIdx = this.students.findIndex( item => { return item.number == m.number; });
						this.students[sIdx].resize = false;
					});
					socket.on(message.studentDisconnect, m => {
						const sIdx = this.students.findIndex( item => { return item.number == m.number; });
						Vue.set(this.students, sIdx, Object.assign({},this.students[sIdx],{disco: true}));
						//this.students[sIdx].disco = true;
					});
					socket.on(message.studentConnect, m => {
						const sIdx = this.students.findIndex( item => { return item.number == m.number; });
						this.students[sIdx].disco = false;
					});
					socket.on(message.newAnswer, m => {
						let paperIdx = this.evaluation.papers.findIndex( item => {
							return item.number == m.number;
						});
						if (paperIdx === -1)
						{
							// First answer
							paperIdx = this.evaluation.papers.length;
							this.evaluation.papers.push({
								number: m.number,
								inputs: [ ], //other fields irrelevant here
							});
						}
						// TODO: notations not coherent (input / answer... when, which ?)
						this.evaluation.papers[paperIdx].inputs.push(JSON.parse(m.answer)); //input+index
					});
				},
			});
		},
		endMonitoring: function() {
			// In the end, send answers to students
			// TODO: disable this button until everyone finished (need ability to mark absents)
			socket.emit(
				message.allAnswers,
				{ answers: JSON.stringify(this.evaluation.questions.map( q => { return q.answer; })) }
			);
		},
	},
});
