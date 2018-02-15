// TODO: createCollections users, courses, assessments
// with:
// users
//   unique initials, email
//   index initials, email
// courses
//   unique (code,uid)
//   index (code,uid)
// evaluations
//   unique (cid, name)
//   index (cid, name)
// db.evaluations.createIndex( { cid: 1, name: 1 } );
// https://docs.mongodb.com/manual/core/index-compound/
