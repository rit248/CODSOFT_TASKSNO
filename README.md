# CODSOFT — Web Development Internship (Level 1)

All three Level 1 tasks, built with HTML, CSS and vanilla JavaScript. No frameworks, no build step — open any file in a browser and it runs.

| Task | Project | Files | Tech |
|---|---|---|---|
| Level 1 · Task 1 | Personal portfolio | `task1_portfolio.html` | HTML, CSS Grid, Flexbox |
| Level 1 · Task 2 | Landing page (Dabba) | `task2_landing_page.html` | HTML, CSS Grid, responsive layout |
| Level 1 · Task 3 | Calculator | `task3_calculator.html` | HTML, CSS Grid, JavaScript |

## Task 1 — Portfolio

A single-page portfolio with a sticky side rail on desktop that collapses to a stacked layout on mobile.

Sections: header (name + tagline + nav), about (photo and bio), skills, projects, resume download, contact, footer with copyright.

**Edit before submitting** — search the file for the word `EDIT`:
1. Your name and tagline in the header
2. Your photo — replace the placeholder `<svg>` in the About section with `<img src="assets/profile.jpg" alt="Photo of …">`
3. Your bio, skills, and the three projects with real links
4. Add your resume at `assets/resume.pdf`
5. Email, phone, GitHub and LinkedIn in the Contact section, and the year/name in the footer

## Task 2 — Landing page

A product landing page for a fictional tiffin delivery service. Sticky nav, hero with an SVG illustration, stats bar, three-step explainer, weekly menu cards, three pricing plans, testimonial, sign-up form, and a four-column footer. Everything is CSS Grid and Flexbox; it reflows to one column below 780px.

## Task 3 — Calculator

- Addition, subtraction, multiplication, division
- Percent, sign flip, backspace, decimal point, AC
- Chained operations (`2 + 3 + 4` computes as you go)
- A history tape — click any past answer to load it back into the display
- Full keyboard support: digits, `+ - * /`, `Enter`, `Backspace`, `Esc`
- Division by zero shows a message instead of `Infinity`
- Buttons laid out with CSS Grid; logic uses event listeners, a switch statement and a single state object

## Running locally

```bash
git clone https://github.com/<your-username>/CODSOFT_TASKSNO.git
cd CODSOFT_TASKSNO
# then just open any .html file in your browser
```

## Deploying with GitHub Pages

1. Push these files to your repo
2. Settings → Pages → Source: `main` branch, `/root`
3. Your pages will be live at `https://<your-username>.github.io/<repo>/task1_portfolio.html`

## Submission checklist

- [ ] Personal details filled into the portfolio
- [ ] Resume PDF added at `assets/resume.pdf`
- [ ] Repo named `CODSOFT_TASKSNO`, pushed to GitHub
- [ ] Demo video recorded and posted on LinkedIn with the repo link
- [ ] `#codsoft #internship #webdevelopment` added to the post, CodSoft tagged
- [ ] Repo link submitted in the task submission form

---

# Level 2 projects

| Task | Project | File |
|---|---|---|
| Level 2 · Task 1 | Job Board (Hirepool) | `task5_job_board.html` |
| Level 2 · Task 2 | Online Quiz Maker (Quizly) | `task4_quiz_maker.html` |

Both are single-file apps built with vanilla JavaScript. All data access is isolated in one module (`Api` in the job board, `Store` in the quiz maker), so each function maps one-to-one onto a REST endpoint if you later add an Express + MongoDB backend — the views never touch storage directly.

## Job Board — Hirepool

- **Home page** with search and featured listings
- **Job listings page** with keyword, location and employment-type filters
- **Job detail page** with responsibilities, requirements and applicant count
- **Employer dashboard** — post a job, open/close a role, delete it, review applicants, shortlist or reject
- **Candidate dashboard** — profile (headline, skills) and a table of applications with live status
- **Application form** with validation and resume upload (type and 2 MB size check)
- **Notifications** — an in-app inbox standing in for transactional email, with an unread badge
- **Authentication** with two roles (candidate / employer); passwords are digested, not stored in plain text
- **Responsive** from 360px up

Try it with the seeded employer account, or register your own.

## Online Quiz Maker — Quizly

- **Home page** with live counts and recent quizzes
- **Quiz creation** — title, description, unlimited questions, up to four options each, radio-marked correct answer, full validation before publishing
- **Quiz taking** — one question at a time with a progress bar and back navigation
- **Quiz results** — score, percentage, pass/fail against a 60% mark, and a per-question review showing your answer next to the correct one
- **Quiz listing** with search
- **User authentication** — required to publish, optional to take
- **My activity** — quizzes you published (deletable) and every attempt you have made
- **Responsive** from 360px up

Two demo quizzes are seeded so the app is not empty on first load.

## Turning these into the full MERN stack

If you want to extend either project into a real backend:

1. `npm init -y && npm i express mongoose cors bcryptjs jsonwebtoken`
2. Create a Mongoose model per collection (User, Job, Application / User, Quiz, Attempt)
3. Add one route per method in the `Api` / `Store` module — the names already match (`POST /api/jobs`, `POST /api/jobs/:id/apply`, `POST /api/quizzes`, etc.)
4. Replace each function body with a `fetch()` call and `await` it. The views need no changes beyond awaiting.
