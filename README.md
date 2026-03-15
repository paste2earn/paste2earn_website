# Paste2Earn

A Reddit task-based earning platform. Users earn money by completing Reddit comment/post tasks.

## Stack
- **Frontend**: React.js (Vite) — `http://localhost:5173`
- **Backend**: Node.js + Express — `http://localhost:5000`
- **Database**: PostgreSQL

---

## Setup Instructions

### 1. Database Setup (PostgreSQL)
Create the database and run the schema:
```bash
createdb -U postgres paste2earn
psql -U postgres -d paste2earn -f backend/schema.sql
```

**Note:** If your database already exists and you need to add missing columns, run:
```bash
psql -U postgres -d paste2earn -f backend/migrate.js
```

### 2. Backend Setup
```bash
cd backend
npm install
# Copy .env.example to .env and update values
cp .env.example .env
# Edit .env with your PostgreSQL credentials and Discord bot config
npm run dev
```
Backend runs on `http://localhost:5000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### 4. Discord Bot Setup (Optional)
See [DISCORD_BOT_SETUP.md](DISCORD_BOT_SETUP.md) for detailed instructions.

---

## Default Admin Account
| Field    | Value                     |
|----------|---------------------------|
| Email    | admin@paste2earn.com      |
| Password | admin123                  |

---

## User Flow
1. Register with Reddit username + profile URL
2. Admin approves the account
3. User claims a task
4. User completes it on Reddit and submits proof (URL + 3 comments)
5. Admin reviews submission and approves
6. $1.50 (comment) or $2.00 (post) credited to wallet

## Admin Flow
1. Login as admin
2. Users List → Approve/Reject user registrations
3. Create Task → Add new comment or post tasks
4. Submissions → Review and approve/reject submitted task proofs
# paste2earn_website
