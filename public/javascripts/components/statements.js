Vue.component("statements", {
	// 'answers' is an object containing
	//   'inputs'(array),
	//   'displayAll'(bool), //TODO: should be in questions!
	//   'showSolution'(bool),
	//   'indices': order of appearance
	//   'index': current integer index (focused question)
	props: ['questions','answers'],
	// TODO: general render function for nested exercises
	// There should be a questions navigator below, or next (visible if display=='all')
	// Full questions tree is rendered, but some parts hidden depending on display settings
	render(h) {
		// TODO: render nothing if answers is empty
		let domTree = (this.questions || [ ]).map( (q,i) => {
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
								checked: this.answers.inputs.length > 0 && this.answers.inputs[i][idx],
								disabled: monitoring,
							},
							attrs: {
								id: this.inputId(i,idx),
								type: "checkbox",
							},
							on: {
								change: e => { this.answers.inputs[i][idx] = e.target.checked; },
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
								choiceCorrect: this.answers.showSolution && this.questions[i].answer.includes(idx),
								choiceWrong: this.answers.showSolution && this.answers.inputs[i][idx] && !q.answer.includes(idx),
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
			if (this.answers.displayAll && i < this.questions.length-1)
				questionContent.push( h("hr") );
			return h(
				"div",
				{
					"class": {
						"question": true,
						"hide": !this.answers.displayAll && this.answers.indices[this.answers.index] != i,
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
			domTree
		);
	},
	mounted: function() {
		statementsLibsRefresh();
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
