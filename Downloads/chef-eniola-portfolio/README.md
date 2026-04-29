# Chef Eniola - Personal Chef Portfolio

A stunning, modern portfolio website for Chef Eniola, showcasing authentic Nigerian cuisine with contemporary flair. This full-stack web application features a beautiful frontend with smooth animations and a powerful admin dashboard for content management.

## 🌟 About Chef Eniola

Chef Eniola is a talented personal chef from Nigeria, specializing in creating unforgettable culinary experiences. From intimate private dining to grand event catering, Chef Eniola brings warmth, authenticity, and modern techniques to every dish.

## ✨ Features

### Public-Facing Website
- **Hero Section**: Captivating introduction with smooth animations
- **About**: Chef Eniola's story and culinary philosophy
- **Visual Menu**: Stunning parallax gallery showcasing signature dishes
- **Client Stories**: Carousel of customer testimonials
- **User Reviews**: Grid display of customer review images from WhatsApp
- **In The Kitchen**: Behind-the-scenes video gallery
- **Contact/Booking**: Service options with direct WhatsApp integration
- **Responsive Design**: Optimized for all devices
- **Smooth Animations**: Powered by Framer Motion

### Admin Dashboard
Secure admin panel for content management:
- **Gallery Management**: Upload and manage menu photos
- **Reviews Management**: Add/edit customer testimonials
- **Image Reviews**: Manage customer review screenshots
- **Kitchen Videos**: Upload behind-the-scenes content
- **Real-time Updates**: Changes reflect instantly on the website

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **React Router** for navigation

### Backend & Database
- **Supabase** for:
  - PostgreSQL database
  - Authentication
  - Storage (images & videos)
  - Real-time subscriptions

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Ademileke12/chefeniola.git
cd chefeniola
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these credentials from your [Supabase Dashboard](https://app.supabase.com).

### 4. Database Setup

Run the database schema setup:

```bash
# Connect to your Supabase project and run:
psql -h your-project.supabase.co -U postgres -d postgres -f supabase-schema.sql
```

Or use the Supabase SQL Editor to run the contents of `supabase-schema.sql`.

### 5. Create Admin User

```bash
node create-admin-user.js
```

Follow the prompts to create your admin account.

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the website.

## 📱 Admin Access

Navigate to `/admin` and log in with your admin credentials to access the dashboard.

## 🎨 Customization

### Brand Colors

Edit `tailwind.config.js` to customize the color scheme:

```javascript
colors: {
  'brand-bg': '#f8f5f0',
  'brand-surface': '#1a1a1a',
  'brand-ink': '#2d2d2d',
  'brand-accent': '#d4a574',
}
```

### WhatsApp Number

Update the WhatsApp contact number in:
- `src/components/Contact.tsx`
- `src/components/WhatsAppButton.tsx`

## 📂 Project Structure

```
chefeniola/
├── src/
│   ├── components/
│   │   ├── About.tsx
│   │   ├── Contact.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── ImageReviews.tsx
│   │   ├── LocalGallery.tsx
│   │   ├── LocalVideos.tsx
│   │   ├── Navbar.tsx
│   │   ├── Reviews.tsx
│   │   ├── WhatsAppButton.tsx
│   │   └── admin/
│   │       ├── AdminGallery.tsx
│   │       ├── AdminImageReviews.tsx
│   │       ├── AdminKitchenVideos.tsx
│   │       └── AdminReviews.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Admin.tsx
│   │   └── Home.tsx
│   ├── supabase.ts
│   └── main.tsx
├── public/
│   └── gl/              # Local gallery images
├── supabase-schema.sql
└── package.json
```

## 🗄️ Database Schema

The application uses the following tables:

- **gallery**: Menu/dish photos
- **reviews**: Customer testimonials
- **image_reviews**: Customer review screenshots
- **kitchen_videos**: Behind-the-scenes videos

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Deploy to Netlify

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist` folder to Netlify
3. Configure environment variables in Netlify dashboard

## 📸 Features Showcase

### Visual Menu Gallery
- Responsive masonry layout
- Parallax scroll effects
- Smooth hover animations
- Automatic image optimization

### Admin Dashboard
- Drag-and-drop file uploads
- Real-time preview
- Bulk operations
- Secure authentication

### Contact & Booking
- Service type selection (Private Dining / Event Catering)
- Direct WhatsApp integration
- Floating WhatsApp button
- Mobile-optimized

## 🔒 Security

- Environment variables for sensitive data
- Supabase Row Level Security (RLS)
- Admin authentication required
- Secure file uploads

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 📞 Contact

For inquiries about Chef Eniola's services:
- WhatsApp: +234 907 806 1757
- Website: [Your deployed URL]

## 🙏 Acknowledgments

- Design inspiration from modern culinary portfolios
- Built with love for authentic Nigerian cuisine
- Powered by Supabase and React

---

**Made with ❤️ for Chef Eniola**
