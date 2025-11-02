# Group Calendar Scheduling Web Application

## Proposed Architecture

The architecture of this application will be composed of an HTML, CSS, and JavaScript front end and a Node.js/Express backend with a PostgreSQL (relational) database. The frontend will handle user interactions and dynamically update the interface, while the backend will manage authentication, data storage, and business logic.

## Database Schema (Initial)

The schema consists of four main tables to manage users, calendars, memberships, and events:

**Users** (id, email, password_hash, created_at)

**Calendars** (id, name, type, owner_id, created_at)

**Calendar_Members** (calendar_id, user_id, joined_at)

**Events** (id, title, date, time, priority, status, description, recurring, recurrence_pattern, canceled, created_by, created_at)

## Routes & HTTP Methods (Initial)

**Login Page** -- POST, GET

**Calendar View** -- GET, POST, PUT, DELETE

**Event Management** -- POST, GET, PUT, DELETE

**Group Calendar Management** -- POST, GET, DELETE

## Routes & Webpage Functionality (Initial)

**Login Page** -- User authentication (sign up and sign in)

**Calendar View** -- View all events, filter by calendar type (personal/group), switch between calendar views

**Event Management** -- Create event with title/date/time/priority, update event details, mark event as complete, cancel event, delete event, set recurring events

**Group Calendar Management** -- Create group calendar, join group calendar with code, leave group calendar, delete group calendar (owner only), invite users to calendar
