// TODO: createCollections users, courses, assessments
// with:
// users
//   unique initials, email
//   index initials, email
// courses
//   unique (code,uid)
//   index (code,uid)
// assessments
//   unique (cid, name)
//   index (cid, name)
// db.assessments.createIndex( { cid: 1, name: 1 } );
// https://docs.mongodb.com/manual/core/index-compound/
