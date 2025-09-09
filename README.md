# Syngenta Debugging AI Tool

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/prashants-projects-2956c2ef/v0-syngenta-debugging-ai)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)

## Overview

A comprehensive AI-powered debugging and development tool specifically designed for Syngenta Group's development needs. This tool provides intelligent code analysis, real-time debugging assistance, and automated code generation capabilities for SFMC (Salesforce Marketing Cloud) development.

## Features

- **AI-Powered Code Analysis**: Intelligent debugging and code review capabilities
- **Real-time Error Detection**: Live analysis of code issues and performance bottlenecks
- **SFMC Integration**: Specialized tools for Salesforce Marketing Cloud development
- **Cloud Pages Generator**: Automated generation of responsive cloud pages
- **Code Generation**: AI-assisted code generation for various programming languages
- **Performance Monitoring**: System health dashboard and metrics tracking

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Next.js API Routes
- **AI Integration**: Azure OpenAI GPT-4
- **Database**: Redis for caching
- **Deployment**: Docker, Kubernetes, Vercel
- **Testing**: Jest, Performance Testing Suite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Docker (optional)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Prash7661/Syngenta-Debugging-Tool.git
cd Syngenta-Debugging-Tool
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Run the development server
```bash
npm run dev
```

## Deployment

The application is deployed on Vercel and can be accessed at:
**[https://vercel.com/prashants-projects-2956c2ef/v0-syngenta-debugging-ai](https://vercel.com/prashants-projects-2956c2ef/v0-syngenta-debugging-ai)**

## Architecture

The application follows a modular architecture with:
- Service-oriented design pattern
- Comprehensive error handling and monitoring
- Scalable caching layer
- Security-first approach with encrypted data handling
