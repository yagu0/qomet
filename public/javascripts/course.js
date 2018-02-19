/*Draft format (compiled to json)
 * TODO: separate questions and answers in Evaluation object

<some html question (or/+ exercise intro)>

	<some html subQuestion>
	* some answer [trigger input/index in answers]

	<another subquestion>

		<sub-subQuestion>
		+ choix1
		- choix 2
		+ choix 3
		- choix4

		<another sub sub> with params interpolation £ (tout simplement)
		/ params: javascript parameter generator (another function, body only)
		* answer 2 (which can
		be on
		several lines)

<Some second question>
* With answer

	dans le cas de parametetrized, answer est une fonction javascript !! qui prend en arg le(s) param(s)
	coté serveur on stock parameterized question + body func
	une fois côté client, extra work first to 1) execute each func 2) replace (and store!!!) all params
https://stackoverflow.com/questions/7650071/is-there-a-way-to-create-a-function-from-a-string-with-javascript

	*/

new Vue({
	el: '#course',
	data: {
		display: "evaluations", //or "students" (in admin mode)
		course: course,
		monitorPwd: "",
		newEvaluation: { name: "" },
		evaluationArray: evaluationArray,
		mode: "view", //or "edit" (some evaluation)
		evaluationIndex: 0, //current edited evaluation index
		evaluation: { }, //copy of evaluation at editing index in array
		questionsText: "", //questions in an evaluation, in text format
	},
	mounted: function() {
		$('.modal').modal();
		Materialize.updateTextFields(); //textareas, time field...
	},
	methods: {
		// GENERAL:
		toggleDisplay: function(area) {
			if (this.display == area)
				this.display = "";
			else
				this.display = area;
		},
		studentList: function(group) {
			return this.course.students
				.filter( s => { return group==0 || s.group == group; })
				.map( s => { return Object.assign({}, s); }) //not altering initial array
				.sort( (a,b) => { return a.name.localeCompare(b.name); })
		},
		// STUDENTS:
		uploadTrigger: function() {
			$("#upload").click();
		},
		upload: function(e) {
			let file = (e.target.files || e.dataTransfer.files)[0];
			Papa.parse(file, {
				header: true,
				skipEmptyLines: true,
				complete: (results,file) => {
					let students = [ ];
					// Post-process: add group/number if missing
					let number = 1;
					results.data.forEach( d => {
						if (!d.group)
							d.group = 1;
						if (!d.number)
							d.number = number++;
						if (typeof d.number !== "string")
							d.number = d.number.toString();
						students.push(d);
					});
					$.ajax("/courses/student-list", {
						method: "PUT",
						data: {
							cid: this.course._id,
							students: JSON.stringify(students),
						},
						dataType: "json",
						success: res => {
							if (!res.errmsg)
								this.course.students = students;
							else
								alert(res.errmsg);
						},
					});
				},
			});
		},
		// evaluation:
		addEvaluation: function() {
			if (!admin)
				return;
			// modal, fill code and description
			let error = Validator.checkObject(this.newEvaluation, "Evaluation");
			if (!!error)
				return alert(error);
			else
				$('#newEvaluation').modal('close');
			$.ajax("/evaluations",
				{
					method: "POST",
					data: {
						name: this.newEvaluation.name,
						cid: course._id,
					},
					dataType: "json",
					success: res => {
						if (!res.errmsg)
						{
							this.newEvaluation["name"] = "";
							this.evaluationArray.push(res);
						}
						else
							alert(res.errmsg);
					},
				}
			);
		},
		updateEvaluation: function() {
			$.ajax("/evaluations", {
				method: "PUT",
				data: {evaluation: JSON.stringify(this.evaluation)},
				dataType: "json",
				success: res => {
					if (!res.errmsg)
					{
						this.evaluationArray[this.evaluationIndex] = this.evaluation;
						this.mode = "view";
					}
					else
						alert(res.errmsg);
				},
			});
		},
		deleteEvaluation: function(evaluation) {
			if (!admin)
				return;
			if (confirm("Delete evaluation '" + evaluation.name + "' ?"))
			{
				$.ajax("/evaluations",
					{
						method: "DELETE",
						data: { qid: this.evaluation._id },
						dataType: "json",
						success: res => {
							if (!res.errmsg)
								this.evaluationArray.splice( this.evaluationArray.findIndex( item => {
									return item._id == evaluation._id;
								}), 1 );
							else
								alert(res.errmsg);
						},
					}
				);
			}
		},
		toggleState: function(questionIndex) {
			// add or remove from activeSet of current evaluation
			let activeIndex = this.evaluation.activeSet.findIndex( item => { return item == questionIndex; });
			if (activeIndex >= 0)
				this.evaluation.activeSet.splice(activeIndex, 1);
			else
				this.evaluation.activeSet.push(questionIndex);
		},
		setEvaluationText: function() {
			let txt = "";
			this.evaluation.questions.forEach( q => {
				txt += q.wording; //already ended by \n
				q.options.forEach( (o,i) => {
					let symbol = q.answer.includes(i) ? "+" : "-";
					txt += symbol + " " + o + "\n";
				});
				txt += "\n"; //separate questions by new line
			});
			this.questionsText = txt;
		},
		parseEvaluation: function() {
			let questions = [ ];
			let lines = this.questionsText.split("\n").map( L => { return L.trim(); })
			lines.push(""); //easier parsing
			let emptyQuestion = () => {
				return {
					wording: "",
					options: [ ],
					answer: [ ],
					active: true, //default
				};
			};
			let q = emptyQuestion();
			lines.forEach( L => {
				if (L.length > 0)
				{
					if (['+','-'].includes(L.charAt(0)))
					{
						if (L.charAt(0) == '+')
							q.answer.push(q.options.length);
						q.options.push(L.slice(1).trim());
					}
					else if (L.charAt(0) == '*')
					{
						// TODO: read current + next lines into q.answer (HTML, 1-elem array)
					}
					else
						q.wording += L + "\n";
				}
				else
				{
					// Flush current question (if any)
					if (q.wording.length > 0)
					{
						questions.push(q);
						q = emptyQuestion();
					}
				}
			});
			this.evaluation.questions = questions;
		},
		actionEvaluation: function(index) {
			if (admin)
			{
				// Edit screen
				this.evaluationIndex = index;
				this.evaluation = $.extend(true, {}, this.evaluationArray[index]);
				this.setEvaluationText();
				this.mode = "edit";
				Vue.nextTick(statementsLibsRefresh);
			}
			else //external user: show evaluation
				this.redirect(this.evaluationArray[index].name);
		},
		redirect: function(evaluationName) {
			document.location.href = "/" + initials + "/" + course.code + "/" + evaluationName;
		},
		setPassword: function() {
			let hashPwd = Sha1.Compute(this.monitorPwd);
			let error = Validator.checkObject({password:hashPwd}, "Course");
			if (error.length > 0)
				return alert(error);
			$.ajax("/courses/password",
				{
					method: "PUT",
					data: {
						cid: this.course._id,
						pwd: hashPwd,
					},
					dataType: "json",
					success: res => {
						if (!res.errmsg)
							alert("Password saved!");
						else
							alert(res.errmsg);
					},
				}
			);
		},
		// NOTE: artifact required for Vue v-model to behave well
		checkboxFixedId: function(i) {
			return "questionFixed" + i;
		},
		checkboxActiveId: function(i) {
			return "questionActive" + i;
		},
	},
});
