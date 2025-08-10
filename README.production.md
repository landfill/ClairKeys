# ClairKeys - Production Deployment Guide

## 🚀 Deployment Overview

ClairKeys is configured for seamless deployment on Vercel with comprehensive performance monitoring and production optimizations.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
```bash
# Copy and configure environment variables
cp .env.example .env.local
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL database connection
- `NEXTAUTH_URL` - Your production domain
- `NEXTAUTH_SECRET` - Secure random string
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - OAuth providers
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` - OAuth providers
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### 2. Database Setup
```bash
# Generate and push schema
npx prisma generate
npx prisma db push

# Optional: Seed database
npm run db:seed
```

### 3. Build Verification
```bash
# Test production build locally
npm run build
npm run start

# Run tests
npm test

# Check bundle size
npm run analyze
```

## 🌐 Vercel Deployment

### Option 1: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXTAUTH_SECRET
vercel env add DATABASE_URL
# ... add all required variables

# Deploy to production
vercel --prod
```

### Option 2: GitHub Integration
1. Connect repository to Vercel
2. Configure environment variables in dashboard
3. Deploy automatically on push to main branch

### Vercel Configuration
The project includes `vercel.json` with optimized settings:
- Extended timeouts for API routes
- Performance headers
- Security headers
- Caching policies

## 📊 Performance Monitoring

### Built-in Analytics
- **Web Vitals tracking** - Core Web Vitals measurement
- **Performance Dashboard** - Real-time metrics visualization  
- **Alert System** - Automated performance issue detection
- **Analytics API** - Performance data collection endpoint

### Monitoring Setup
```typescript
// Automatic initialization in app
import { performanceMonitor } from '@/lib/analytics'

// Performance data sent to /api/analytics/performance
// Dashboard available at /admin/performance
```

### Performance Thresholds
- **LCP (Largest Contentful Paint)**: < 2.5s (good), < 4s (acceptable)
- **FID (First Input Delay)**: < 100ms (good), < 300ms (acceptable)
- **CLS (Cumulative Layout Shift)**: < 0.1 (good), < 0.25 (acceptable)
- **FCP (First Contentful Paint)**: < 1.8s (good), < 3s (acceptable)
- **TTFB (Time to First Byte)**: < 800ms (good), < 1.8s (acceptable)

## 🔧 Production Optimizations

### Implemented Optimizations
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Code Splitting**: Dynamic imports and lazy loading
- **Bundle Optimization**: Webpack configuration for optimal chunks
- **Caching Strategy**: Comprehensive browser and API caching
- **Animation Performance**: 60fps optimizations with throttling
- **Canvas Optimization**: Efficient rendering for piano animations

### Performance Features
- Service Worker for offline functionality
- Intersection Observer for lazy loading
- Resource preloading and prefetching
- Gzip compression enabled
- Static asset optimization

## 🔐 Security Configuration

### Headers
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer Policy optimization
- Permissions Policy restrictions

### API Security
- Rate limiting on API routes
- CORS configuration
- Request validation
- Error handling without sensitive data exposure

## 📈 Monitoring & Maintenance

### Health Checks
```bash
# Health check endpoint
curl https://your-domain.com/api/health
```

### Performance Monitoring
- Real-time Web Vitals dashboard
- Performance alert system
- Trend analysis and reporting
- User session analytics

### Logging
- Structured logging for errors
- Performance metric collection
- Critical alert notifications

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

**Database Connection:**
```bash
# Test database connection
npx prisma db push
```

**Performance Issues:**
- Check Web Vitals dashboard
- Review Performance Alert system
- Analyze bundle with `npm run analyze`

### Environment Debugging
```bash
# Check environment variables
npm run env:check

# Verify API endpoints
curl https://your-domain.com/api/health/detailed
```

## 📱 Mobile Optimization

- Responsive design with mobile-first approach
- Touch-optimized piano interface
- Optimized bundle sizes for mobile networks
- Progressive Web App (PWA) capabilities

## 🔄 Deployment Pipeline

### Continuous Integration
```yaml
# .github/workflows/deploy.yml included
- Code quality checks
- TypeScript compilation
- Test execution
- Performance testing
- Automated deployment
```

### Staging Environment
- Test deployments on preview branches
- Environment parity with production
- Performance monitoring in staging

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Performance Best Practices](https://nextjs.org/docs/basic-features/built-in-css-support)

## 📞 Support

For deployment issues or questions:
1. Check the troubleshooting section
2. Review application logs in Vercel dashboard
3. Monitor performance alerts for issues
4. Verify environment variable configuration

---

**Production URL**: Set your domain in `NEXTAUTH_URL`  
**Performance Dashboard**: `/admin/performance`  
**Health Check**: `/api/health`