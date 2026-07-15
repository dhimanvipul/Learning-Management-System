# LMS Backend — Phase 2 (MongoDB)

Phase 2 of the SkillifyMe LMS backend (**Week 2 · Day 9**). The in-memory arrays
from Phase 1 are replaced with a real **MongoDB** database via **Mongoose** —
so data now persists across restarts. The module-based architecture is unchanged;
only the data layer was upgraded.

## Architecture
```
          ┌──────────┐   HTTP    ┌──────────────────────────┐   Mongoose   ┌───────────┐
 Client → │ Postman  │ ────────▶ │  Express App  (/api/v1)  │ ───────────▶ │  MongoDB  │
          └──────────┘           │  students · courses ·    │              │  lms_db   │
                                 │  instructors · enroll.   │ ◀─────────── │ (on disk) │
          Response ◀──────────── │  { success, data }       │   documents  └───────────┘
                                 └──────────────────────────┘
   server.js → connectDB() (config/db.js) → app.listen()
```

## Folder structure
```
lms-backend/
├── config/
│   └── db.js                          # ✨ mongoose.connect (MONGO_URI)
├── modules/
│   ├── students/
│   │   ├── student.model.js           # ✨ schema + model
│   │   ├── student.controller.js      # refactored to use the model
│   │   └── student.routes.js
│   ├── courses/      (model, controller, routes)
│   ├── instructors/  (model, controller, routes)
│   └── enrollments/  (model, controller, routes)   # links student ↔ course
├── utils/
│   └── apiResponse.js                 # success() / error()
├── app.js                             # mounts modules under /api/v1
├── server.js                          # dotenv → connectDB() → listen
├── .env                               # ✨ MONGO_URI, PORT  (gitignored)
├── .gitignore
└── package.json
```
✨ = new in Phase 2.

## Setup & run
```bash
# 1. Have MongoDB running locally (mongodb://localhost:27017)
#    or paste an Atlas URI into .env
npm install
npm start          # → ✅ MongoDB connected → 🚀 Server on http://localhost:3000
```
`.env` (already included for local dev):
```
MONGO_URI=mongodb://localhost:27017/lms_db
PORT=3000
```

## Data models (Mongoose schemas)
```
Student     { name*, email* (unique), age (min 0) }            + timestamps
Course      { title*, code (unique), credits (default 3),
              instructorId → Instructor }                       + timestamps
Instructor  { name*, subject*, email (unique) }                 + timestamps
Enrollment  { studentId* → Student, courseId* → Course,
              grade (default "N/A") }                           + timestamps
```
`*` = required. Mongoose auto-adds `_id`, `createdAt`, `updatedAt`.

## API Endpoints (Phase 2: Create & Read)

| Method | Endpoint                  | Body                              | Success |
|--------|---------------------------|-----------------------------------|---------|
| POST   | /api/v1/students          | name, email, age                  | 201     |
| GET    | /api/v1/students          | –                                 | 200     |
| GET    | /api/v1/students/:id      | –                                 | 200/404 |
| POST   | /api/v1/courses           | title, code, instructorId         | 201     |
| GET    | /api/v1/courses           | –                                 | 200     |
| POST   | /api/v1/instructors       | name, subject, email              | 201     |
| GET    | /api/v1/instructors       | –                                 | 200     |
| POST   | /api/v1/enrollments       | studentId, courseId               | 201/404 |
| GET    | /api/v1/enrollments       | – (populates student & course)    | 200     |

Standard response shape:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "message" }
```

### Recommended test order (Postman)
1. `POST /instructors` → copy the returned `_id`
2. `POST /courses` (use that `_id` as `instructorId`) → note `credits` defaults to 3
3. `POST /students` → copy the `_id`
4. `POST /enrollments` (`studentId`, `courseId`) → links them
5. `GET /enrollments` → returns enrollments with the student & course populated
6. **Restart the server, then `GET /students`** → the data is still there ✅

Import `lms-backend-phase2.postman_collection.json` for all requests.

## MongoDB Compass — what to capture (screenshot placeholders)
- **[Screenshot 1]** Compass connected to `mongodb://localhost:27017`, `lms_db` in the sidebar
- **[Screenshot 2]** The `students` collection showing your created documents (with `_id`, `createdAt`)
- **[Screenshot 3]** A single student document expanded
- **[Screenshot 4]** The `enrollments` collection showing the studentId/courseId references

## Validation & errors you'll see
- Missing a required field → **400** with the Mongoose validation message
- Reusing a unique `email`/`code` → **400** (E11000 duplicate key)
- Enrolling with an id that doesn't exist → **404** Student or Course not found

## Refactoring tips / next steps
- Add Update & Delete with `findByIdAndUpdate` / `findByIdAndDelete`.
- Extract the repeated `try/catch` into a small async-handler wrapper.
- Add pagination & filtering to the `GET` lists with query params.

---
SkillifyMe — Gateway to Tech Mastery
