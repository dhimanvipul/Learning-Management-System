# 🎓 SkillifyMe LMS — MERN Learning Management System

A complete **Learning Management System (LMS)** built using the **MERN Stack** with separate **Admin** and **Student** panels.

The project allows administrators to manage students, courses, instructors, and enrollments while students can access their assigned courses through their own dashboard.

---

# 🚀 Tech Stack

### Frontend
- React.js (Create React App)
- React Router DOM v6
- Axios
- React Icons
- CSS3
- Responsive Design

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

---

# 🎨 Theme

- Black
- Gold
- White

Modern Dashboard UI with responsive layout.

---

# 👨‍💻 Authentication

✔ Signup

✔ Login

✔ Role Based Authentication

Roles:

- Admin
- Student

After login:

Admin

```
/admin
```

Student

```
/student
```

LocalStorage stores

```json
{
   "_id": "",
   "username": "",
   "email": "",
   "role": ""
}
```

---

# 🛠 Admin Panel Features

### Dashboard

- Total Students
- Total Courses
- Total Instructors
- Total Enrollments
- Recent Students
- Recent Enrollments
- Quick Actions

---

### Students

- View Students
- Add Student
- Student Details
- Search Student

---

### Courses

- View Courses
- Add Course
- Search Course

---

### Instructors

- View Instructors
- Add Instructor
- Search Instructor

---

### Enrollments

- Assign Course to Student
- View All Enrollments

---

# 🎓 Student Panel

### Dashboard

Student statistics and overview.

---

### My Courses

Displays only courses assigned to the logged-in student.

Information shown:

- Course Name
- Instructor
- Progress
- Continue Learning Button

---

### Progress

(Currently under development)

---

### Profile

(Currently under development)

---

# 🔐 Role Protection

Admin cannot access student pages.

Student cannot access admin pages.

Unauthorized users are redirected automatically.

---

# 📁 Project Structure

```
src
│
├── components
│   ├── Navbar
│   ├── Sidebar
│   ├── Cards
│   ├── Common
│   └── Table
│
├── layouts
│   ├── AdminLayout.jsx
│   └── StudentLayout.jsx
│
├── pages
│   ├── Dashboard
│   ├── Students
│   ├── Courses
│   ├── Instructors
│   ├── Enrollments
│   ├── Login.jsx
│   ├── Signup.jsx
│   └── NotFound
│
├── routes
│   └── AppRoutes.js
│
├── services
│
└── styles
```

---

# 🗄 Database Collections

```
users

students

courses

instructors

enrollments

lessons

sections
```

---

# 📡 API Endpoints

## Authentication

```
POST /signup

POST /login
```

---

## Students

```
GET /students

POST /students

GET /students/:id
```

---

## Courses

```
GET /courses

POST /courses
```

---

## Instructors

```
GET /instructors

POST /instructors
```

---

## Enrollments

Assign Course

```
POST /api/enrollments
```

Student Courses

```
GET /api/enrollments/student/:id
```

Self Enrollment

```
POST /api/enrollments/self
```

---

# 💾 Installation

Clone Repository

```bash
git clone <repository-url>
```

Install Frontend

```bash
npm install
```

Install Backend

```bash
npm install
```

Start Backend

```bash
npm start
```

Start Frontend

```bash
npm start
```

---

# 🌟 Current Working Features

✅ Authentication

✅ Role Based Login

✅ Admin Dashboard

✅ Student Dashboard

✅ Students Management

✅ Courses Management

✅ Instructor Management

✅ Enrollment System

✅ My Courses

✅ Responsive Sidebar

✅ Responsive Navbar

✅ Protected Routes

---

# 🚧 Upcoming Features

- Progress Tracking
- Course Completion
- Video Lessons
- Lesson & Section Module
- Certificates
- Student Profile
- Notifications
- Search Improvements
- Pagination
- Course Purchase / Self Enrollment
- Admin Analytics
- Continue Learning Page

---

# 📷 Screenshots

Add screenshots here after UI completion.

---

# 👨‍💻 Developed By

**Vipul Dhiman**

MERN Stack Developer

Learning Management System (SkillifyMe)