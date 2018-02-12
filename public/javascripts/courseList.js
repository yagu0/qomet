new Vue({
	el: '#courseList',
	data: {
		courseArray: courseArray,
		newCourse: {
			code: "",
			description: "",
		},
	},
	mounted: function() {
		$('.modal').modal();
	},
	methods: {
		redirect: function(code) {
			document.location.href = "/" + initials + "/" + code;
		},
		addCourse: function() {
			if (!admin)
				return;
			// modal, fill code and description
			let error = Validator.checkObject({code:this.newCourse.code}, "Course");
			if (!!error)
				return alert(error);
			else
				$('#newCourse').modal('close');
			$.ajax("/add/course",
				{
					method: "GET",
					data: this.newCourse,
					dataType: "json",
					success: res => {
						if (!res.errmsg)
						{
							this.newCourse["code"] = "";
							this.newCourse["description"] = "";
							this.courseArray.push(res);
						}
						else
							alert(res.errmsg);
					},
				}
			);
		},
		deleteCourse: function(course) {
			if (!admin)
				return;
			if (confirm("Delete course '" + course.code + "' ?"))
				$.ajax("/remove/course",
					{
						method: "GET",
						data: { cid: course._id },
						dataType: "json",
						success: res => {
							if (!res.errmsg)
								this.courseArray.splice( this.courseArray.findIndex( item => {
									return item._id == course._id;
								}), 1 );
							else
								alert(res.errmsg);
						},
					}
				);
			},
		}
});
