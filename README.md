# Aspire Chess Academy Backend API

A Node.js/Express backend API for managing students (testimonials) and tournaments with admin authentication.

## Features

- **Admin Authentication**: JWT-based authentication for admin users
- **Student Management**: CRUD operations for student testimonials
- **Tournament Management**: Full tournament lifecycle management
- **File Upload**: Support for tournament poster images
- **Security**: Rate limiting, CORS, input validation, and secure headers
- **Database**: MongoDB with Mongoose ODM

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/aspire-chess-academy
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   NODE_ENV=development
   
   # Admin Credentials
   ADMIN_EMAIL=admin@aspirechess.com
   ADMIN_PASSWORD=admin123456
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the API**
   - API Base URL: `http://localhost:5000/api`
   - Health Check: `http://localhost:5000/api/health`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Students (Public & Admin)
- `GET /api/students` - Get all active students (public)
- `GET /api/students/admin` - Get all students with filters (admin)
- `GET /api/students/:id` - Get single student
- `POST /api/students` - Create student (admin)
- `PUT /api/students/:id` - Update student (admin)
- `PATCH /api/students/:id/toggle-status` - Toggle active status (admin)
- `DELETE /api/students/:id` - Delete student (admin)
- `PATCH /api/students/reorder` - Reorder students (admin)

### Tournaments (Public & Admin)
- `GET /api/tournaments` - Get active upcoming tournaments (public)
- `GET /api/tournaments/past` - Get past tournaments (public)
- `GET /api/tournaments/admin` - Get all tournaments with filters (admin)
- `GET /api/tournaments/:id` - Get single tournament
- `POST /api/tournaments` - Create tournament with poster upload (admin)
- `PUT /api/tournaments/:id` - Update tournament (admin)
- `PATCH /api/tournaments/:id/participants` - Update participant count (admin)
- `PATCH /api/tournaments/:id/complete` - Mark tournament complete (admin)
- `PATCH /api/tournaments/:id/toggle-status` - Toggle active status (admin)
- `DELETE /api/tournaments/:id` - Delete tournament (admin)

## Default Admin Account

The system creates a default admin account on first startup:

- **Email**: `admin@aspirechess.com`
- **Password**: `admin123456`

**⚠️ Important**: Change the default password immediately after first login!

## Data Models

### Student Model
```javascript
{
  name: String (required),
  title: String (required),
  rating: String (required),
  peakRating: String (required),
  program: String (required),
  achievements: [String] (required),
  joinDate: String (required),
  testimonial: String (required),
  image: String (default: '👨‍🎓'),
  bio: String (required),
  isActive: Boolean (default: true),
  displayOrder: Number (default: 0)
}
```

### Tournament Model
```javascript
{
  name: String (required),
  date: Date (required),
  time: String (required),
  location: String (required),
  address: String (required),
  entryFee: String (required),
  prizePool: String (required),
  maxParticipants: Number (required),
  currentParticipants: Number (default: 0),
  format: String (required),
  timeControl: String (required),
  category: String (enum),
  registrationLink: String (required),
  poster: String (default: '🏆'),
  posterImage: String (optional),
  description: String (required),
  listUntil: Date (required),
  status: String (enum: upcoming/ongoing/completed/cancelled),
  isActive: Boolean (default: true),
  winner: String (optional),
  finalParticipants: Number (optional)
}
```

## File Upload

Tournament posters can be uploaded:
- **Endpoint**: `POST /api/tournaments` (with multipart/form-data)
- **Field Name**: `posterImage`
- **Supported Formats**: JPEG, JPG, PNG, GIF, WebP
- **Max Size**: 5MB
- **Storage**: `/uploads/posters/`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation using express-validator
- **CORS**: Configured for frontend domains
- **Helmet**: Security headers
- **Password Hashing**: bcryptjs with salt rounds

## Error Handling

The API returns consistent error responses:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for automatic server restart on file changes.

### Environment Variables
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: Token expiration time
- `NODE_ENV`: Environment (development/production)
- `ADMIN_EMAIL`: Default admin email
- `ADMIN_PASSWORD`: Default admin password

### Database Setup

1. **Local MongoDB**:
   ```bash
   # Install MongoDB locally or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **MongoDB Atlas** (Cloud):
   - Create account at mongodb.com
   - Create cluster and get connection string
   - Update `MONGODB_URI` in `.env`

## Production Deployment

1. **Environment Setup**:
   ```bash
   NODE_ENV=production
   # Use strong JWT_SECRET
   # Use production MongoDB URI
   ```

2. **Security Considerations**:
   - Change default admin credentials
   - Use HTTPS in production
   - Configure proper CORS origins
   - Set up proper logging
   - Use environment variables for secrets

3. **Process Management**:
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name "aspire-api"
   ```

## API Testing

You can test the API using tools like Postman or curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aspirechess.com","password":"admin123456"}'

# Get students (public)
curl http://localhost:5000/api/students

# Get tournaments (public)
curl http://localhost:5000/api/tournaments
```

## Support

For issues and questions:
1. Check the logs for error details
2. Verify environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Check network connectivity and CORS settings

## License

MIT License - see LICENSE file for details.