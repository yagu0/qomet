# qomet - WARNING: prototype stage

### Questions Ouvertes ou à options Multiples pour l'Évaluation des éTudiants

Or "... pour Examens sur inTernet", in french. In english, just revert the acronym:

"sTudents Evaluation with Multiple choices or Open Questions (or ...inTernet Exams with).

Source code of [qomet.auder.net](https://qomet.auder.net)

## Features

Allow teachers to create courses, containing assessments. Each of them can be public, or
restricted to a classroom (identification by student ID).
Individual answers to an exam are monitored in real time, and feedback is sent
to each participant in the end (answers, computing grade).
Once a series of exam is over, the teacher can get all grades in CSV format from course page.

*Note:* for now the monitoring + socket part is still unimplemented,
and exams composition is limited to single question exercises.
Automatic grades are also not available.

## Installation

See setup/README

## Usage

TODO: write tutorial, maybe a demo video.

*Note about exams:*
Once an assessment is started, it's impossible to quit and restart using another browser,
because a password stored in cookies need to be sent with every request.
So under normal circumstances it's also impossible for a student to continue the exam of another.
(The password is destroyed when exam ends or when the teacher decides to finish assessment).

## Limitations

Version "standard classroom": some potential cheating ways,
 - headless browsers with renamed http-user-agent; difficult to counter with 100% confidence
 - block JS script using e.g. [uBlock Origin](https://github.com/gorhill/uBlock), then re-inject the script cleaned of listeners
 - intercept HTTP response to "start quiz" signal, re-compose the page without listeners and run

The only way to garanty zero internet cheat is to use some SELinux configuration in kiosk mode
with just one safe web browser enabled, e.g. [surf](https://surf.suckless.org/).
Not that more traditional ways of cheating may still be used (phones, talking, signs, memos...)

## Alternative softwares

 * [moodle](https://moodle.org)<br/>
  Full-featured (open source!) project to manage learning activities.
  Too big for my purpose; however qomet might be re-thought as a moodle plugin
  (although [at least one](https://moodle.org/plugins/mod_exam) already exists for this task).

 * [evalbox](https://evalbox.com/)<br/>
  The closest to my goals, but only for simple quizzes, and not actively developed anymore.

 * [wims](http://wims.unice.fr/~wims/)<br/>
  Full-featured (and open source) training center for students, with various types of exercises,
  possibly in exam mode too.
  The spirit, however, is more "enhanced homework" than "internet exams".

 * [socrative](https://socrative.com/)<br/>
  Nice looking realtime feedback (lacking in evalbox), but thought for interactive classes.
  In this perspective, I also found [educaplay](https://www.educaplay.com) appealing.

 * [testmoz](https://testmoz.com/)<br/>
  Old-fashioned look, lacking some features. Still interesting to set-up a quick test.
