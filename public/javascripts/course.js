/*Draft format (compiled to json)

> Some global (HTML) intro

<some html question (or/+ exercise intro)>

	<some html subQuestion>
	* some answer [trigger input/index in answers]

	<another subquestion>

		<sub-subQuestion>
		+ choix1
		- choix 2
		+ choix 3
		- choix4

		<another sub sub>
		* answer 2 (which can
		be on
		several lines)

<Some second question>
* With answer
*/

new Vue({
	el: '#course',
	data: {
		display: "assessments", //or "students", or "grades" (admin mode)
		course: course,
		mode: "view", //or "edit" (some assessment)
		monitorPwd: "",
		newAssessment: { name: "" },
		assessmentArray: assessmentArray,
		assessmentIndex: 0, //current edited assessment index
		assessment: { }, //copy of assessment at editing index in array
		assessmentText: "", //questions in an assessment, in text format
	},
	mounted: function() {
		$('.modal').each( (i,elem) => {
			if (elem.id != "assessmentEdit")
				$(elem).modal();
		});
		$('ul.tabs').tabs();
		$('#assessmentEdit').modal({
			complete: () => {
				this.parseAssessment();
				Vue.nextTick( () => {
					$("#questionList").find("code[class^=language-]").each( (i,elem) => {
						Prism.highlightElement(elem);
					});
					MathJax.Hub.Queue(["Typeset",MathJax.Hub,"questionList"]);
				});
			},
		});
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
		// ASSESSMENT:
		addAssessment: function() {
			if (!admin)
				return;
			// modal, fill code and description
			let error = Validator.checkObject(this.newAssessment, "Assessment");
			if (!!error)
				return alert(error);
			else
				$('#newAssessment').modal('close');
			$.ajax("/assessments",
				{
					method: "POST",
					data: {
						name: this.newAssessment.name,
						cid: course._id,
					},
					dataType: "json",
					success: res => {
						if (!res.errmsg)
						{
							this.newAssessment["name"] = "";
							this.assessmentArray.push(res);
						}
						else
							alert(res.errmsg);
					},
				}
			);
		},
		materialOpenModal: function(id) {
			$("#" + id).modal("open");
			Materialize.updateTextFields(); //textareas, time field...
		},
		updateAssessment: function() {
			$.ajax("/assessments", {
				method: "PUT",
				data: {assessment: JSON.stringify(this.assessment)},
				dataType: "json",
				success: res => {
					if (!res.errmsg)
					{
						this.assessmentArray[this.assessmentIndex] = this.assessment;
						this.mode = "view";
					}
					else
						alert(res.errmsg);
				},
			});
		},
		deleteAssessment: function(assessment) {
			if (!admin)
				return;
			if (confirm("Delete assessment '" + assessment.name + "' ?"))
			{
				$.ajax("/assessments",
					{
						method: "DELETE",
						data: { qid: this.assessment._id },
						dataType: "json",
						success: res => {
							if (!res.errmsg)
								this.assessmentArray.splice( this.assessmentArray.findIndex( item => {
									return item._id == assessment._id;
								}), 1 );
							else
								alert(res.errmsg);
						},
					}
				);
			}
		},
		toggleState: function(questionIndex) {
			// add or remove from activeSet of current assessment
			let activeIndex = this.assessment.activeSet.findIndex( item => { return item == questionIndex; });
			if (activeIndex >= 0)
				this.assessment.activeSet.splice(activeIndex, 1);
			else
				this.assessment.activeSet.push(questionIndex);
		},
		setAssessmentText: function() {
			let txt = "";
			this.assessment.questions.forEach( q => {
				txt += q.wording; //already ended by \n
				q.options.forEach( (o,i) => {
					let symbol = q.answer.includes(i) ? "+" : "-";
					txt += symbol + " " + o + "\n";
				});
				txt += "\n"; //separate questions by new line
			});
			this.assessmentText = txt;
		},
		parseAssessment: function() {
			let questions = [ ];
			let lines = this.assessmentText.split("\n").map( L => { return L.trim(); })
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
			this.assessment.questions = questions;
		},
		actionAssessment: function(index) {
			if (admin)
			{
				// Edit screen
				this.assessmentIndex = index;
				this.assessment = $.extend(true, {}, this.assessmentArray[index]);
				this.setAssessmentText();
				this.mode = "edit";
				Vue.nextTick( () => {
					$("#questionList").find("code[class^=language-]").each( (i,elem) => {
						Prism.highlightElement(elem);
					});
					MathJax.Hub.Queue(["Typeset",MathJax.Hub,"questionList"]);
				});
			}
			else //external user: show assessment
				this.redirect(this.assessmentArray[index].name);
		},
		redirect: function(assessmentName) {
			document.location.href = "/" + initials + "/" + course.code + "/" + assessmentName;
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
