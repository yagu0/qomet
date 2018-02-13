/*
 * questions group by index prefix 1.2.3 1.1 ...etc --> '1'

NOTE: questions can contain parameterized exercises (how ?
--> describe variables (syntax ?)
--> write javascript script (OK, users trusted ? ==> safe mode possible if public website)
Imaginary example: (using math.js)
	<params> (avant l'exo)
	x: math.random()
	y: math.random()
	M: math.matrix([[7, x], [y, -3]]);
	res: math.det(M)
	</params>
	<div>Calculer le déterminant de 
	$$\begin{matrix}7 & x\\y & -3\end{matrix}$$</div>
	* ...
*/

Vue.component("statements", {
	// 'inputs': array of index (as in questions) + input (text or array of ints)
	// display: 'all', 'one', 'solution'
	// iidx: current level-0 integer index (can match a group of questions / inputs)
	props: ['questions','inputs','display','iidx'],
	data: function() {
		return {
			displayStyle: "compact", //or "all": all on same page
		};
	}
	// Full questions tree is rendered, but some parts hidden depending on display settings
	render(h) {
		let domTree = (this.questions || [ ]).map( (q,i) => {
			let questionContent = [ ];
			questionContent.push(
				h(
					"h4",
					{
						"class": {
							"questionIndex": true,
						}
					},
					q.index
				)
			);
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
			if (!!q.options)
			{
				// quiz-like question
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
							[ '' ] //to work in Firefox 45.9 ESR @ ENSTA...
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
			}
			if (this.display == "all" && !this.navigator && i < this.questions.length-1)
				questionContent.push( h("hr") );
			const depth = (q.index.match(/\./g) || []).length;
			return h(
				"div",
				{
					"class": {
						"question": true,
						"hide": this.display == "one" && this.iidx != i,
						"depth" + depth: true,
					},
				},
				questionContent
			);
		});
		const navigator = h(
			"div",
			{
				"class": {
					"hide": this.displayStyle == "all"
				},
			},
			[
				h(
					"button",
					{
						"class": {
							"btn": true,
						},
						on: {
							click: () => {
								this.index = Math.max(0, this.index - 1);
							},
						},
					},
					[ h("span", { "class": { "material-icon": true } }, "fast_rewind") ]
				), //onclick: index = max(0,index-1)
				h("span",{ },(this.iidx+1).toString()),
				h(
					"button",
					{
						"class": {
							"btn": true,
						},
						on: {
							click: () => {
								this.index = Math.min(this.index+1, this.questions.length-1)
							},
						},
					},
					[ h("span", { "class": { "material-icon": true } }, "fast_forward") ]
				)
			]
		);
		domTree.push(navigator);
		domTree.push(
			h(
				"button",
				{
					on: {
						click: () => {
							this.displayStyle = displayStyle == "compact" ? "all" : "compact";
						},
					},
				},
				this.displayStyle == "compact" ? "Show all" : "Navigator"
			)
		);
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
		statementsLibsRefresh();
	},
	methods: {
		inputId: function(i,j) {
			return "q" + i + "_" + "input" + j;
		},
	},
});
