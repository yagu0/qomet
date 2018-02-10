window.onload = function() {

	const messages = {
		"login": "Go",
		"register": "Send",
	};

	const ajaxUrl = {
		"login": "/sendtoken",
		"register": "/register",
	};

	const infos = {
		"login": "Connection token sent. Check your emails!",
		"register": "Registration complete! Please check your emails.",
	};

	const animationDuration = 300; //in milliseconds

	// Basic anti-bot measure: force at least N seconds between arrival on page, and register form validation:
	const enterTime = Date.now();

	new Vue({
		el: '#login',
		data: {
			messages: messages,
			user: {
				name: "",
				email: "",
			},
			stage: "login", //or "register"
		},
		mounted: function() {
			// https://laracasts.com/discuss/channels/vue/vuejs-set-focus-on-textfield
			this.$refs.userEmail.focus();
		},
		methods: {
			toggleStage: function(stage) {
				let $form = $("#form");
				$form.fadeOut(animationDuration);
				setTimeout( () => {
					this.stage = stage;
					$form.show(0);
				}, animationDuration);
			},
			submit: function() {
				if (this.stage=="register")
				{
					if (Date.now() - enterTime < 5000)
						return;
				}
				let error = Validator.checkObject({email: this.user.email}, "User");
				if (!error && this.stage == "register")
					error = Validator.checkObject({name: this.user.name}, "User");
				let $dialog = $("#dialog");
				show($dialog);
				setTimeout(() => {hide($dialog);}, 3000);
				if (error.length > 0)
					return showMsg($dialog, "error", error);
				showMsg($dialog, "process", "Processing... Please wait");
				$.ajax(ajaxUrl[this.stage],
					{
						method: "GET",
						data:
						{
							email: encodeURIComponent(this.user.email),
							name: encodeURIComponent(this.user.name), //may be unused
						},
						dataType: "json",
						success: res => {
							if (!res.errmsg)
							{
								this.user["name"] = "";
								this.user["email"] = "";
								showMsg($dialog, "info", infos[this.stage]);
							}
							else
								showMsg($dialog, "error", res.errmsg);
						},
					}
				);
			},
		}
	});

};
