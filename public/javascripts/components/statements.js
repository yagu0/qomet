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

--> input of type text (number, or vector, or matrix e.g. in R syntax)
--> parameter stored in question.param (TODO)

*/

Vue.component("statements", {
	// 'inputs': object with key = question index and value = text or boolean array
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
		// Prepare questions groups, ordered
		let questions = this.questions || [ ]
		let questionGroups = _.groupBy(questions, q => {
			const dotPos = q.index.indexOf(".");
			return dotPos === -1 ? q.index : q.index.substring(0,dotPos);
		});
		let domTree = questionGroups.map( (qg,i) => {
			// Re-order questions 1.1.1 then 1.1.2 then...
			const orderedQg = qg.sort( (a,b) => {
				let aParts = a.split('.').map(Number);
				let bParts = b.split('.').map(Number);
				const La = aParts.length, Lb = bParts.length;
				for (let i=0; i<Math.min(La,Lb); i++)
				{
					if (aParts[i] != bParts[i])
						return aParts[i] - bParts[i];
				}
				return La - Lb; //the longer should appear after
			});
			let qgDom = orderedQg.map( q => {
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
										checked: this.inputs[q.index][idx],
										disabled: monitoring,
									},
									attrs: {
										id: this.inputId(q.index,idx),
										type: "checkbox",
									},
									on: {
										change: e => { this.inputs[q.index][idx] = e.target.checked; },
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
										"for": this.inputId(q.index,idx),
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
										choiceCorrect: this.display == "solution" && q.answer.includes(idx),
										choiceWrong: this.display == "solution" && this.inputs[q.index][idx] && !q.answer.includes(idx),
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
				const depth = (q.index.match(/\./g) || []).length;
				return h(
					"div",
					{
						"class": {
							"question": true,
							"depth" + depth: true,
						},
					},
					questionContent
				);
			});
			return h(
				"div",
				{
					"class": {
						"questionGroup": true,
						"hide": this.display == "one" && this.iidx != i,
					},
				}
				qgDom
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
				),
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
