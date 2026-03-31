# Portfolio Backend

A complete backend system for Palkesh Katariya's videography portfolio website.

## Features

- **Contact Form Handling**: Store client inquiries in a SQLite database
- **Admin Panel**: Manage portfolio work items (add, edit, delete)
- **Authentication**: Secure admin login with session management
- **RESTful API**: Clean API endpoints for frontend integration

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

3. Access the website at `http://localhost:3000`
4. Admin panel at `http://localhost:3000/admin` (also available at `/admin.html` in local Express mode)

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

**⚠️ Change the default password immediately after first login!**

## API Endpoints

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Get all inquiries (admin only)

### Work
- `GET /api/work` - Get all work items
- `POST /api/work` - Add work item (admin only)
- `PUT /api/work/:id` - Update work item (admin only)
- `DELETE /api/work/:id` - Delete work item (admin only)

### Auth
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/status` - Check login status

## Database

Uses SQLite (`portfolio.db`) with the following tables:
- `clients` - Contact form submissions
- `work` - Portfolio work items
- `admins` - Admin users

## Security Notes

- Change default admin password
- Use HTTPS in production
- Implement proper CORS settings for production
- Add rate limiting for contact form
- Validate and sanitize all inputs

## Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up proper environment variables
4. Use a production database (PostgreSQL/MySQL)
5. Implement proper logging
6. Set up SSL/TLS

## Vercel + GitHub Deployment (Frontend)

This project can be deployed on Vercel as a static frontend while keeping the API backend on another host (for example Render/Railway).

1. Push this repository to GitHub.
2. In Vercel, import the GitHub repo and deploy.
3. Vercel serves `index.html` at the root URL `/`, and that file redirects to `portfolio (1).html`.
4. Admin panel is available at `/admin` (and `/admin.html` is kept as a compatibility route).

### Configure Backend URL

Frontend code supports an optional global variable named `window.API_BASE_URL`.

- If not set: frontend calls `/api/...` on the same domain.
- If set: frontend calls `https://your-backend-domain/api/...`.

Example (add before the main script in HTML files):

```html
<script>
   window.API_BASE_URL = 'https://your-backend-domain.com';
</script>
```

Use this in both `portfolio (1).html` and `public/admin.html` when frontend and backend are hosted separately.