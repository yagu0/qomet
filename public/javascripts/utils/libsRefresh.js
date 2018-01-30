function statementsLibsRefresh()
{
	// Run Prism + MathJax on questions text
	$("#statements").find("code[class^=language-]").each( (i,elem) => {
		Prism.highlightElement(elem);
	});
	MathJax.Hub.Queue(["Typeset",MathJax.Hub,"statements"]);
}
