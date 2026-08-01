# FarmWise - Smart Crop Advisory Platform

## Overview

FarmWise is a progressive web application (PWA) designed to provide AI-powered crop recommendations and yield predictions for Indian farmers. The platform integrates machine learning models with real-time weather data to deliver personalized farming advisory on irrigation, fertilizers, and pest management. Built with offline-first capabilities and multilingual support, the application serves farmers across various districts in India with localized agricultural insights.

The system combines soil health data, weather conditions, and location-based information to generate intelligent crop recommendations and yield forecasts, helping farmers make informed decisions about their agricultural practices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Internationalization**: i18next for multilingual support (15+ Indian languages)
- **PWA Features**: Service workers for caching, IndexedDB for offline storage
- **Voice Integration**: Web Speech API for text-to-speech functionality

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Database**: JSON file-based storage system (farmers.json, soil_data.json, predictions.json)
- **ML Integration**: Python-based machine learning service with crop recommendation and yield prediction models
- **API Design**: RESTful API endpoints for farmer management, predictions, and data retrieval
- **Development Setup**: Vite middleware integration for hot reloading in development

### Data Storage Solutions
- **File-based Storage**: JSON files for persistent data storage instead of traditional databases
- **Offline Storage**: Browser IndexedDB for offline functionality
- **Caching Strategy**: Service worker implementation for static asset caching and offline support
- **Local Storage**: Browser localStorage for user preferences and session data

### Authentication and Authorization
- **Simple Authentication**: Phone number and name-based farmer identification
- **Local Session Management**: Client-side farmer profile storage
- **No Complex Auth**: Simplified access model suitable for rural users
- **District-based Access**: Location-based data filtering and recommendations

### ML Model Integration
- **Crop Recommendation Model**: Random Forest classifier with 99.45% accuracy
- **Yield Prediction Model**: Decision Tree regressor for production forecasting
- **Python ML Service**: Separate Python service handling model inference
- **Feature Processing**: Automated soil and weather data preprocessing
- **Model Files**: Pre-trained models stored as .pkl and .joblib files

### Progressive Web App Features
- **Offline Functionality**: Complete offline operation with cached predictions
- **Installable**: App-like installation on mobile devices
- **Responsive Design**: Mobile-first responsive interface
- **Push Notifications**: Service worker support for notifications
- **App Manifest**: PWA manifest configuration for installation

### Multilingual Support
- **i18next Integration**: Comprehensive internationalization framework
- **Language Switching**: Runtime language switching capability
- **Voice Output**: Text-to-speech in multiple Indian languages
- **Cultural Adaptation**: District-specific and language-specific content

## External Dependencies

### Weather Services
- **OpenWeather API**: Real-time weather data integration
- **Geolocation Services**: Browser geolocation API for location-based services

### Machine Learning Infrastructure
- **Python ML Stack**: NumPy, Pandas, Scikit-learn for model inference
- **Model Serialization**: Pickle and Joblib for model persistence
- **FastAPI Integration**: Planned integration for ML service API

### UI and Design Libraries
- **Radix UI**: Comprehensive component primitives
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: Component variant management

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS

### Database and Storage
- **Neon Database**: Serverless PostgreSQL (configured but using JSON storage)
- **Drizzle ORM**: Database toolkit (prepared for future database migration)
- **Connect PG Simple**: Session store for PostgreSQL

### Voice and Accessibility
- **Web Speech API**: Native browser text-to-speech functionality
- **Date-fns**: Date manipulation and formatting library
- **React Hook Form**: Form state management and validation

### Development Dependencies
- **React Query DevTools**: Development debugging tools
- **Replit Integration**: Platform-specific development plugins
- **Error Boundary**: Runtime error handling and reporting