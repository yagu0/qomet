# qomet - WARNING: prototype stage

### Questions Ouvertes ou à options Multiples pour l'Évaluation des éTudiants

Or "... pour Examens sur inTernet", in french. In english, just revert the acronym:

"sTudents Evaluation with Multiple choices or Open Questions (or ...inTernet Exams with).

Source code of [qomet.auder.net](https://qomet.auder.net)

## Features

Allow teachers to create courses, containing assessments. Each of them can be public, or
restricted to a classroom (identification by student ID).
Individual answers to an exam are monitored in real time, and answers are sent
to each participant in the end (allowing them to estimate their grade).
Once a series of exam is over, the teacher can get all grades in CSV format
(assuming all questions were either quiz-like or parameterized).

## Installation

See setup/README

## Usage

As a teacher, first create an account from the upper-left "login" menu.
Then create a course using the appropriate button in the middle of the screen.
Finally, create some exams ("new assessment" button). The syntax for a series of questions is described by the following example:

	Question 1 text or introduction (optional if there are subquestions)

		Text for question 1.1 (index detected from indentation)
		* Answer to 1.1

		Question 1.2 (a text is optional since there are subquestions)

			Question 1.2.1 text (mandatory); e.g. quiz-like:
			+ choice 1
			- choice 2
			- choice 3

			Question 1.2.2 text (mandatory); e.g. open question:
			* answer to 1.2.2 (can be on several lines)
	
	Question 2 text ...
	* An answer to question 2
	...

All question texts (and open answers) can be on several lines.
HTML markup (slightly limited) can be used, as well as [MathJax](https://www.mathjax.org/) with $ and $$ delimiters,
and syntax highlighting using [prism](http://prismjs.com/): `<code class="language-xyz">` for language code `xyz`.
The syntax for parameterized exercises (not working yet) is still undecided.

Use the "exam" mode if browsing the web is allowed, and "watch" mode otherwise to monitor
students actions like losing focus or resizing window.
Finally the "secure" mode forbids all attempts to do anything else than focusing on the exam,
but can be "a bit too much"; keep in mind next section if using it.
All these modes restrict the access to a classroom. To open a series of question to the world,
the "open" mode is for you.

*Note about exams:*
Once an assessment is started, it's impossible to quit and restart using another browser,
because a password stored in cookies need to be sent with every request.
So under normal circumstances it's also impossible for a student to continue the exam of another.
(The password is destroyed when exam ends or when the teacher decides to finish assessment).

## Limitations & workarounds

Version "standard classroom": some potential internet cheating ways even in 'secure' mode (in addition to
the usual ones like using phones, talking, doing signs, using short memos...)

 - headless browsers with renamed http-user-agent; difficult to counter with 100% confidence
 - block JS script using e.g. [uBlock Origin](https://github.com/gorhill/uBlock), then re-inject the script cleaned of listeners
 - intercept HTTP response to "start quiz" signal, re-compose the page without listeners and run

The easy way to prevent these cheating attempts would consist in installing qomet on a local server,
and restricting exam rooms to the intranet while preventing users to access their account (where they could
keep a copy of the courses). This also prevent internet-based students communication.

Another option (which seems more complicated, but might be required if the intranet itself shouldn't be accessed)
would be to force e.g. chromium in kiosk mode restricted to one domain (using SELinux on a special account maybe).

## Alternative softwares

 * [moodle](https://moodle.org)<br/>
  Full-featured (open source!) project to manage learning activities.
  Too big for my purpose; however qomet might be re-thought as a moodle plugin
  (although [at least one](https://moodle.org/plugins/mod_exam) already exists for this task).

 * [evalbox](https://evalbox.com/)<br/>
  The closest to my goals, but only for simple quizzes, and not actively developed anymore.

 * [wims](http://wims.unice.fr/~wims/)<br/>
  Full-featured (and open source) training center for students, with various types of exercises,
  possibly in exam mode too. The spirit, however, is more "enhanced homework" than "internet exams".

 * [socrative](https://socrative.com/)<br/>
  Nice looking realtime feedback (lacking in evalbox), but thought for interactive classes.
  In this perspective, I also found [educaplay](https://www.educaplay.com) appealing.

 * [testmoz](https://testmoz.com/)<br/>
  Old-fashioned look, lacking some features. Still interesting to set-up a quick test.
