# DAKI Retro Hub — Real-Time Multiplayer Agile Retrospective

DAKI Retro Hub is a real-time, multiplayer retrospective web application designed for agile teams. Built using React, TypeScript, and powered by Supabase, it facilitates interactive and structured team retrospectives across multiple remote browsers. 

The application utilizes a sleek, dark-mode glassmorphic user interface and includes a custom Web Audio API synthesizer for micro-interactions and audio feedback.

---

## Key Features & Retro Workflow

The retrospective is divided into **8 structured phases** synchronized in real-time across all team members:

1. **🎮 Warmup Game (Phase 1)**
   - A synchronized balloon-popping mini-game. 
   - Late-joining team members have their timers computed dynamically from the database start timestamp to remain in sync. 
   - Poppy sound synthesizers are generated on-the-fly using the Web Audio API. 
   - A live team leaderboard updates scores in real-time.
2. **💬 Synced Icebreaker (Phase 2)**
   - Facilitators trigger random icebreaker discussion prompts.
   - Input forms are locked so team members can only answer for their own selected identity.
   - Responses are masked (`🔒 Answer hidden until everyone submits`) and automatically revealed in full text once every active team member has saved their answer.
3. **📋 Previous Commitments (Phase 3)**
   - Review active Action Items carried over from the prior retrospective sprint. 
   - Resolve or update item statuses (Open, In Progress, Resolved) dynamically.
4. **📊 Health Check (Phase 5)**
   - Drag-and-drop sliders to rate 5 key parameters: Speed, Quality, Joy, Collaboration, and Process.
   - Results are hidden behind a locked checklist screen until all members submit.
   - Unlocks a custom **SVG Radar Chart (Pentagon)** displaying team-wide performance averages.
5. **🤖 AI Adoption (Phase 5 - NEW)**
   - A dedicated check-in to track the team's transition from basic code completion (e.g. Cursor) to **agentic development workflows**.
   - Rates 3 metrics:
     1. **AI Agent & Skill Integration**: Usage frequency of delegating tasks to AI agents and invoking specialized skills/tools.
     2. **Agentic Skill Mastery**: Comfort levels leveraging agentic skills, invoking tools, and directing AI agent cycles.
     3. **Agentic Value & Trust**: Perceived velocity and code quality improvements of agentic AI assistants.
   - Unlocks a custom **SVG Radar Chart (Equilateral Triangle)** and average progress bars once everyone submits.
6. **🛑 DAKI Board (Phase 6)**
   - Collaborative board divided into four columns: **Drop** (Stop Doing), **Add** (Start Doing), **Keep** (Good Things), and **Improve** (Better Ways).
   - Tag cards with categories (Code, Testing, Process, Docs, Product, General).
   - **Self-Upvote Prevention**: Users are blocked from voting on their own cards. Hovering reveals a disabled state with explanation.
   - **Atomic Upvote Toggling**: Clicking a vote increments the card's like counter and appends the member's ID to the database array; clicking again removes the upvote.
7. **📈 Prioritize (Phase 7)**
   - Facilitator reviews DAKI board cards sorted by upvote counts.
   - Instantly convert cards into new Action Items, select assignees from the team list, and set due dates.
8. **🏆 Score & Summary (Phase 8)**
   - Score the retrospective session value (1 to 5 stars) and write closing feedback.
   - Facilitator archives the active session, logging it in the historic records, and returns the team to the lobby setup.

---

## Project Architecture

### Tech Stack
* **Frontend**: React 18, TypeScript, Vite.
* **Database**: PostgreSQL (Supabase).
* **Multiplayer Sync**: Supabase Realtime Channels (broadcasting `INSERT`, `UPDATE`, and `DELETE` events for sub-tables).
* **Styling**: Pure CSS (Vanilla) with native custom HSL variables and CSS Grid layouts.
* **Audio**: Custom synthesizers built on top of the Web Audio API.

### Codebase Entry Points
* [RetroContext.tsx](src/context/RetroContext.tsx): Manages the state, database initialization, client session settings, and active PostgreSQL event listeners.
* [App.tsx](src/App.tsx): Main router case block that renders phases and includes the global layout header and phase indicators.
* [App.css](src/App.css): Layout guidelines, custom typography, animation definitions, and Vanilla CSS Tailwind emulation classes.
* [SetupPhase.tsx](src/phases/SetupPhase.tsx): Identity lobby step. Allows choosing teams, rejoining active retros, selecting team identities, or adding new team members directly.

---

## Database Schema (Supabase PostgreSQL)

The backend consists of 9 core tables:

```
                  +-------------------+
                  |       teams       |
                  +---------+---------+
                            | (1:N)
                            v
                  +---------+---------+
                  |   team_members    |
                  +---------+---------+
                            | (1:N)
                            v
                  +---------+---------+
                  |  retro_sessions   |
                  +----+----+----+----+
      +----------------+    |    +----------------+
      | (1:N)               | (1:N)               | (1:N)
      v                     v                     v
+-----+-----+         +-----+-----+         +-----+-----+
|game_scores|         | ice_answers |         |daki_cards |
+-----------+         +-----------+         +-----+-----+
      |                     |                     |
      | (1:N)               | (1:N)               | (1:N)
      v                     v                     v
+-----+-----+         +-----+-----+         +-----+-----+
|health_sc. |         | ai_adopt_s. |         |action_it. |
+-----------+         +-----------+         +-----------+
```

### Table Details
1. **`teams`**: Stores team names and IDs.
2. **`team_members`**: Member details (emoji, name, role, team_id).
3. **`retro_sessions`**: Session status, phase index, start dates, active icebreaker questions, game timestamps, and facilitator ID (`created_by`).
4. **`game_scores`**: Pop game records per member.
5. **`icebreaker_answers`**: Icebreaker text responses submitted per member.
6. **`health_check_scores`**: Ratings per member per health metric.
7. **`ai_adoption_scores`**: Ratings per member per agentic adoption question.
8. **`daki_cards`**: Categorized columns, author details, votes count, and **`voted_by`** text arrays to prevent duplicate upvoting.
9. **`action_items`**: Commitments, assignees, due dates, and status.

---

## Row Level Security (RLS) & Production Security

> [!WARNING]
> For this collaborative sandbox prototype, Row Level Security (RLS) is disabled. This allows rapid multiplayer prototyping, but exposes tables to public read/write access.

Before deploying to a public production host, you should log into Supabase and run the following security queries to enable RLS:

```sql
-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icebreaker_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_adoption_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daki_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Add read policies (Example: Allow SELECT access to anyone with API Key)
CREATE POLICY "Allow public select" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public select" ON public.team_members FOR SELECT USING (true);
-- Continue creating matching Insert/Update policies scoped to authenticated user roles.
```

---

## Local Sandbox Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Supabase Credentials**:
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-public-anon-key>
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or `http://localhost:5174`) in multiple browser windows to test multiplayer state sync.

4. **Verify Production Bundle Build**:
   ```bash
   npm run build
   ```

---

## Vercel Deployment Instructions

1. Push your code repository (excluding `.env.local`) to GitHub.
2. Log into the Vercel Dashboard, import your repository, and expand the **Environment Variables** section.
3. Configure the following keys:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will build the production bundle and assign a public URL.
