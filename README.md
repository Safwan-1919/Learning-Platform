# Learning Platform

A simple and elegant web application to organize, track, and manage your learning resources from across the web. Group YouTube videos, playlists, articles, websites, and Instagram posts into customizable tabs and track your completion progress.

## Features

- **Tab-based Organization:** Group your learning materials into distinct, customizable tabs.
- **Multi-source Support:** Add links from:
  - YouTube (single videos and full playlists)
  - Instagram (posts and reels)
  - Any website/article
- **Automatic Metadata:** The application automatically fetches the title, description, and a thumbnail for each link.
- **Progress Tracking:** Mark items as "completed" to track your learning journey.
- **Clean UI:** A modern, card-based interface for easy viewing.
- **Light & Dark Mode:** Switch between light and dark themes.
- **Admin Panel:** A dedicated section to manage your tabs and content.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** SQLite (local development) & PostgreSQL (production)
- **Data Fetching:** [TanStack Query (React Query)](https://tanstack.com/query/latest)

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up the environment variables:**
    -   Create a new file named `.env` in the root of your project.
    -   Add the `DATABASE_URL` variable. For local development with SQLite, use:
        ```
        DATABASE_URL="file:./db/custom.db"
        ```

4.  **Initialize the database:**
    -   Run the following command to create the SQLite database file and apply the schema:
        ```sh
        npx prisma db push
        ```

5.  **Run the development server:**
    ```sh
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Deployment

This application is ready to be deployed on [Vercel](https://vercel.com/).

**Important:** Before deploying, you must switch from the local SQLite database to a remote PostgreSQL database provider, as file-based databases are not supported on Vercel.

A recommended provider is [Supabase](https://supabase.com/), which offers a generous free tier for PostgreSQL databases.

### Deployment Steps

1.  **Push your code** to a Git repository (e.g., on GitHub).
2.  **Create a PostgreSQL database** on a service like Supabase and get the connection string.
3.  **Update your Prisma Schema** (`prisma/schema.prisma`) to use the `postgresql` provider.
4.  **Connect to your Vercel account,** import your Git repository, and set the `DATABASE_URL` in the project's environment variables.
5.  **Deploy!** Vercel will handle the rest.