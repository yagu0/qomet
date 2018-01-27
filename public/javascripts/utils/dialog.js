function state2col(state)
{
	switch (state)
	{
		case "process":
			return "black";
		case "error":
			return "red";
		case "info":
			return "blue";
		default: //idle
			return "white"; //irrelevant, dialog is hidden
	}
}

function show($dialog)
{
	$dialog.removeClass("hide");
}

function hide($dialog)
{
	$dialog.addClass("hide");
}

function showMsg($dialog, state, msg)
{
	$dialog.html(msg);
	$dialog.css("color", state2col(state));
}
