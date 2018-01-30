Vue.component("statements", {
	props: ['questions','inputs','showAnswers','index'], // index=-1 : show all, otherwise show current question
	// TODO: general render function for nested exercises
	// There should be a questions navigator below, or next (visible if display=='all')
	// Full questions tree is rendered, but some parts hidden depending on display settings
	render(h) {
		let domTree = this.questions.map( (q,i) => {
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
								disabled: monitoring,
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
								choiceCorrect: showAnswers && this.questions[i].answer.includes(idx),
								choiceWrong: showAnswers && this.inputs[i][idx] && !questions[i].answer.includes(idx),
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
						"hide": index >= 0 && index != i,
					},
				},
				questionContent
			);
		});
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
	updated: function() {
		// TODO: next line shouldn't be required: questions wordings + answer + options
		// are processed earlier; their content should be updated at this time.
		statementsLibsRefresh();
	},
	methods: {
		inputId: function(i,j) {
			return "q" + i + "_" + "input" + j;
		},
	},
});
