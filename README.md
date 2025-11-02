# Group Calendar Scheduling Web Application

This repository outlines the proposed architecture for a Group Calendar Scheduling web application using Node.js/Express as the backend framework and a PostgreSQL relational database for data storage.

## Proposed Architecture

The architecture of this application will be composed of an HTML, CSS, and JavaScript front end and a Node.js/Express backend with a PostgreSQL (relational) database. The frontend will handle user interactions and dynamically update the interface, while the backend will manage authentication, data storage, and business logic.

## Database Schema

The database will consist of several tables:

**Users** (id, email, password_hash, created_at)

**Calendars** (id, name, type, owner_id, created_at)

**Calendar_Members** (calendar_id, user_id, joined_at)

**Events** (id, title, date, time, priority, status, description, recurring, recurrence_pattern, canceled, created_by, created_at)

## Node.js Routes and HTTP Methods

**POST /auth/signup** - User account creation

**POST /auth/login** - User authentication

**GET /calendars** - Returns list of user's calendars

**POST /calendars** - Create new group calendar

**DELETE /calendars/<calendar_id>** - Delete group calendar (owner only)

**POST /calendars/<calendar_id>/leave** - Leave group calendar

**POST /calendars/<calendar_id>/invite** - Invite users to calendar

**GET /events** - Returns events for selected calendar(s)

**POST /events** - Create new event

**PUT /events/<event_id>** - Update event details

**DELETE /events/<event_id>** - Delete event

**PATCH /events/<event_id>/cancel** - Cancel event

**PATCH /events/<event_id>/complete** - Mark event as complete

## Route Interaction with Webpage Functionality

The Node.js/Express routes will serve JSON data to the frontend. JavaScript on the frontend will handle user interactions, make fetch requests to the Express routes, and update the webpage content accordingly. The PostgreSQL database will be accessed through the Express backend to store, retrieve, and update information.

**Note:** Actual implementation will involve additional functionalities such as user authentication with JWT tokens, password hashing with bcrypt, authorization middleware, error handling, input validation, and security measures.
