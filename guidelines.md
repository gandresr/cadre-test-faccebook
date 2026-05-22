CADRE AI

AI Engineer Technical Interview

Candidate Guide
v0.2

We don’t test what you’ve memorized. We test how fast you can build.

Read this guide before your interview day.

It covers exactly what to expect, what’s provided, and how you’ll be evaluated.

cadreai.com

Cadre AI | Candidate Interview Guide

Page 2

Welcome
Thanks for interviewing with Cadre AI. We’re excited to see what you can build.
Our engineers build production AI systems every day using Claude Code as their primary development
tool. We don’t believe LeetCode tells us anything useful about whether you’ll be great at that job. Instead,
we’re going to ask you to do what our team does daily: take a product idea, break it down, build it with AI-
augmented tooling, and ship it live.
This guide tells you everything you need to know going in. There are no trick questions and no gotchas.
We want you to perform at your best.

Interview Format
The interview is a single 3-hour session with two phases:
Phase Time What Happens
The Build 2 hours

You’ll receive a challenge prompt and build a full-stack application
from scratch using Claude Code. Push to GitHub and deploy a live,
hosted version.

The Review 45–60 min Demo your deployed app, walk through architecture and code,
discuss how you used Claude Code. A conversation, not a quiz.

⏱ Timing
The clock starts when you make your first git commit.
You’ll have 2 hours from your first git commit. Any code pushed after will not be taken into consideration

What’s Provided For You
You don’t need to bring anything. We provide everything:
Resource Details
GitHub Repo A fresh private repo you’ll have push access to. The challenge prompt will be

in the README.

Claude Code Fully configured with API access. Use it however you want — commands,

subagents, /init. No restrictions.

Deployment Vercel or Render pre-linked to your repo. Push to main and it deploys. No

infrastructure setup.

Cadre AI | Candidate Interview Guide

Page 3

Internet Access Full internet access. Look up docs, Stack Overflow, any resources you

normally use.

�� You Choose the Stack
There is no required tech stack. Use whatever you’re fastest with.
Most candidates choose Next.js + Supabase or Python + React, but anything goes.
The only requirement: it deploys and works on a public URL.

Your Challenge
On interview day, you will be given the specific challenge prompt. Each prompt is deliberately short and
underspecified — how you scope and prioritize is part of the evaluation.

�� For All Challenges
Create a CLAUDE.md and plan.md at the root of your project.
Commit your code to a repo that you will share, this should be a fresh repo.
The app must be deployed and accessible on a public URL.
You will walk through your code, architecture, and Claude Code workflow after the build.

What We’re Looking For
We evaluate five dimensions, weighted by importance to Cadre AI’s engineering culture:
Dimension Weight In Practice
Claude Code Proficiency 30%

How you set up CLAUDE.md, plan.md, use
subagents, custom commands, and manage AI
context. The most important dimension.
System Design &amp; Architecture 25% Your data model, API structure, auth approach,
separation of concerns, and scaling trade-offs.
Development Speed &amp; Scope 20% How fast you deploy, how you prioritize features,
how you manage time under pressure.
Code Quality &amp; Verification 15% Clean code, error handling, catching AI bugs,

knowing what your code does.

Communication &amp; Reasoning 10% Explaining decisions, articulating trade-offs,

productive technical dialogue.

�� The Key Insight

Cadre AI | Candidate Interview Guide

Page 4

We’re not testing whether you can code. We’re testing whether you can think
clearly enough to direct and verify a system that codes with you.

How to Prepare
This interview rewards people who have actually used Claude Code on real projects. Here’s what makes
the biggest difference:

1. Get Comfortable with Claude Code
If you haven’t used Claude Code before, spend time with it before the interview. Key things to practice:
• Running /init on a new project and customizing the generated CLAUDE.md
• Writing a plan.md that breaks a project into phases Claude can execute sequentially
• Using subagents to parallelize independent tasks
• Debugging when Claude generates broken code — providing error output and context back to
Claude
• Knowing when to accept Claude’s output, modify it, or reject it entirely

2. Have a Go-To Tech Stack
Speed matters. Pick a stack you know well and have used with Claude Code. Don’t try something new on
interview day.
Stack Strengths Good For
Next.js + Supabase Auth built-in, real-time DB, fast Vercel

deploys Social apps, dashboards, CRUD apps

Python + FastAPI +
React

Flexible backend, great for AI
integrations AI apps, document processing, APIs
T3 Stack Full type safety, fast with tRPC Complex UIs, real-time features
Rails / Django Batteries included, fast scaffolding CRUD-heavy apps, rapid prototyping

3. Practice the Full Loop
The interview tests the complete cycle: plan → build → deploy → iterate. Practice building a small app end-
to-end in under 2 hours using Claude Code:
• A todo app with auth, real-time sync, and deployment (warm-up, ~30 min)
• A blog platform with markdown support, user accounts, and commenting
• A simple e-commerce storefront with product listings, cart, and checkout flow
Time yourself from first commit to final deploy. Your goal: consistently under 90 minutes for a solid MVP.

Cadre AI | Candidate Interview Guide

Page 5

4. Know Your CLAUDE.md Strategy
During the review, we’ll ask about your CLAUDE.md file. Strong candidates include:
• Project description and goals
• Tech stack and key dependencies
• File structure conventions
• Coding standards (naming, patterns, error handling)
• What NOT to do (common pitfalls, constraints)
Think of CLAUDE.md as onboarding documentation for an extremely fast but context-limited junior
developer.

What Happens in the Review
After the build, we’ll have a 45–60 minute conversation:
Section ~Time What We’ll Discuss
Live Demo 10 min Walk through the deployed app. Show what works, be upfront

about what’s broken.

Architecture 15 min Data model, auth, API design, scaling. The most complex part of

the codebase.

Claude Code Workflow 15 min CLAUDE.md, plan.md, subagents, commands, prompting

strategy, handling AI errors.

Code Deep Dive 10 min Specific functions explained. What Claude generated vs. what

you modified, and why.

Production &amp; Growth 10 min Monitoring, CI/CD, testing, schema migrations. Demo to

production.

✅ Honesty Goes a Long Way
We expect bugs. We expect incomplete features. We expect trade-offs.
The best candidates are honest about what’s broken and articulate about
what they’d do with more time. We’re evaluating judgment, not perfection.

Tips from the Cadre AI Engineering Team
✅ Do This ❌ Avoid This
Plan 5–10 min before coding. Create CLAUDE.md
and plan.md first. Starting to code immediately with no plan or context.

Cadre AI | Candidate Interview Guide

Page 6
Deploy early. Something live within 60 min, even if
minimal.

Waiting until the end. Deployment issues eat build
time.

Small, frequent commits with descriptive messages. One giant commit at the end.
Read and verify Claude’s output. Test as you go. Blindly accepting everything Claude generates.
Use subagents for independent tasks. One massive prompt, 3 min wait, wall of unverified

code.

Cut scope aggressively. 4 working features &gt; 10
broken. Trying to build everything and shipping nothing.
Give Claude error messages + context when
debugging. Re-running the same failing prompt repeatedly.
Ask the interviewer clarifying questions. We want
you to.

Major assumptions about what to build without
checking.

Day-of Logistics

Item Details
Duration ~3 hours total. Plan to be available without interruptions.
Location In-person at Cadre AI’s office, or remote via screen share (your recruiter will

confirm).

Breaks Short breaks are fine during the build phase. The timer continues.
Questions? Email your recruiter. We’re happy to clarify anything about the format.

Frequently Asked Questions
Can I use other AI tools besides Claude Code? Claude Code is the primary tool we provide and
evaluate on. You can use the internet freely, but lean into Claude Code — it’s 30% of your score.
What if I’ve never used Claude Code? Spend several hours practicing before the interview. It’s free to
install. Familiarity is important since it’s the highest-weighted dimension.
What if my deployment breaks? Deployment issues happen. How you handle them is part of the
evaluation. The interviewer can help with platform configuration but not code issues.
What if I don’t finish? Nobody finishes everything. The challenges have more features than 2 hours
allows. A focused MVP with clean code beats an ambitious mess every time.
Can I use component libraries? Yes. Use whatever tools help you move fast. We’re testing engineering
judgment and AI workflow, not CSS skills.

Cadre AI | Candidate Interview Guide

Page 7
Will I know the challenge beforehand? No.

Good luck. Build something great.

We’re rooting for you.
— The Cadre AI Engineering Team