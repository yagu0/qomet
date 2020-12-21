use qomet
db.createCollection("users")
db.createCollection("courses")
db.createCollection("evaluations")
db.users.createIndex({ initials: 1, email: 1 }, { unique: true } )
db.courses.createIndex({ code: 1, uid: 1 }, { unique: true } )
db.evaluations.createIndex({ cid: 1, name: 1 }, { unique: true } )
