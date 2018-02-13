//TODO: compute grades after exam (in teacher's view)

new Vue({
	el: '#grade',
	data: {
		assessmentArray: assessmentArray,
		settings: {
			totalPoints: 20,
			halfPoints: false,
			zeroSum: false,
		},
		group: 1, //for detailed grades tables
		grades: { }, //computed
	},
	mounted: function() {
		// TODO
	},
	methods: {
		// GRADES:
		gradeSettings: function() {
			$("#gradeSettings").modal("open");
			Materialize.updateTextFields(); //total points field in grade settings overlap
		},
		download: function() {
			// Download (all) grades as a CSV file
			let data = [ ];
			this.studentList(0).forEach( s => {
				let finalGrade = 0.;
				let gradesCount = 0;
				if (!!this.grades[s.number])
				{
					Object.keys(this.grades[s.number]).forEach( assessmentName => {
						s[assessmentName] = this.grades[s.number][assessmentName];
						if (_.isNumeric(s[assessmentName]) && !isNaN(s[assessmentName]))
						{
							finalGrade += s[assessmentName];
							gradesCount++;
						}
						if (gradesCount >= 1)
							finalGrade /= gradesCount;
						s["final"] = finalGrade; //TODO: forbid "final" as assessment name
					});
				}
				data.push(s); //number,name,group,assessName1...assessNameN,final
			});
			let csv = Papa.unparse(data, {
				quotes: true,
				header: true,
			});
			let downloadAnchor = $("#download");
			downloadAnchor.attr("download", this.course.code + "_results.csv");
			downloadAnchor.attr("href", "data:text/plain;charset=utf-8," + encodeURIComponent(csv));
			this.$refs.download.click()
			//downloadAnchor.click(); //fails
		},
		showDetails: function(group) {
			this.group = group;
			$("#detailedGrades").modal("open");
		},
		groupList: function() {
			let maxGrp = 1;
			this.course.students.forEach( s => {
				if (s.group > maxGrp)
					maxGrp = s.group;
			});
			return _.range(1,maxGrp+1);
		},
		grade: function(assessmentIndex, studentNumber) {
			if (!this.grades[assessmentIndex] || !this.grades[assessmentIndex][studentNumber])
				return ""; //no grade yet
			return this.grades[assessmentIndex][studentNumber];
		},
		groupId: function(group, prefix) {
			return (prefix || "") + "group" + group;
		},
		togglePresence: function(number, index) {
			// UNIMPLEMENTED
			// TODO: if no grade (thus automatic 0), toggle "exempt" state on student for current exam
			// --> automatic update of grades view (just a few number to change)
		},
		computeGrades: function() {
			// UNIMPLEMENTED
			// TODO: compute all grades using settings (points, coefficients, bonus/malus...).
			// If some questions with free answers (open), display answers and ask teacher action.
			// TODO: need a setting for that too (by student, by exercice, by question)
		},
	},
});
