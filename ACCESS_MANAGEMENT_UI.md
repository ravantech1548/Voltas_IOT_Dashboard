# Access Management User Interface

## Overview

A comprehensive user interface has been created for access management, allowing administrators to:
1. **Create and manage users** (especially operators with username/password)
2. **Create and manage shifts** with operating hours
3. **Assign shifts to operators** for access control

## Features Implemented

### 1. User Management (`/settings` → Users tab)

**Capabilities:**
- ✅ Create new users with username, email, password
- ✅ Assign roles: Admin, Manager, Operator, Viewer
- ✅ Assign clients (optional)
- ✅ Assign shifts (required for operators)
- ✅ Edit existing users
- ✅ Delete users (cannot delete yourself)
- ✅ View all users in a table with role badges

**User Form Fields:**
- **Username** (required)
- **Email** (required)
- **Password** (required for new, optional for edit - leave blank to keep current)
- **Role** (required): Admin, Manager, Operator, Viewer
- **Client** (optional): Dropdown of available clients
- **Shift** (required for Operator role only): Dropdown of active shifts

**Table Display:**
- ID, Username, Email, Role (with color-coded badges), Client, Shift, Actions (Edit/Delete)

### 2. Shift Management (`/settings` → Shifts tab)

**Capabilities:**
- ✅ Create multiple shifts with custom operating hours
- ✅ Set start time and end time (24-hour format)
- ✅ Add descriptions
- ✅ Activate/deactivate shifts
- ✅ Edit existing shifts
- ✅ Delete shifts (only if not assigned to users)

**Shift Form Fields:**
- **Name** (required): e.g., "Morning Shift"
- **Start Time** (required): HH:mm format (24-hour)
- **End Time** (required): HH:mm format (24-hour)
- **Description** (optional): e.g., "Morning shift from 6 AM to 2 PM"
- **Active** (checkbox): Only active shifts can be assigned to operators

**Table Display:**
- ID, Name, Start Time, End Time, Status (Active/Inactive), Actions (Edit/Delete)

**Note:** Shifts can span midnight (e.g., 22:00 - 06:00 for night shifts)

### 3. Integration

**Backend API Endpoints:**
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/shifts` - Get all shifts
- `POST /api/shifts` - Create shift (admin/manager)
- `PUT /api/shifts/:id` - Update shift (admin/manager)
- `DELETE /api/shifts/:id` - Delete shift (admin/manager)

**Security:**
- All user management operations require admin role
- Passwords are hashed using bcrypt before storage
- Shift assignment validation (only active shifts for operators)
- Cannot delete shift if assigned to users

## Usage Instructions

### Creating an Operator User

1. **First, create a shift** (if not already created):
   - Go to Settings → Shifts tab
   - Click "Create New Entry"
   - Enter shift name, start time, end time
   - Ensure "Active" checkbox is checked
   - Click "Create"

2. **Create the operator user**:
   - Go to Settings → Users tab
   - Click "Create New Entry"
   - Fill in:
     - Username (e.g., "operator1")
     - Email (e.g., "operator1@example.com")
     - Password (choose a secure password)
     - Role: Select "Operator"
     - Shift: Select the shift created in step 1
     - Client: Optional (leave blank or select)
   - Click "Create"

### Editing a User

1. Go to Settings → Users tab
2. Find the user in the table
3. Click "Edit"
4. Modify any fields (password is optional - leave blank to keep current)
5. Click "Update"

### Creating Multiple Shifts

1. Go to Settings → Shifts tab
2. Create shifts as needed:
   - Morning Shift: 06:00 - 14:00
   - Afternoon Shift: 14:00 - 22:00
   - Night Shift: 22:00 - 06:00
3. Each shift can be activated/deactivated independently

## Implementation Details

### Files Created/Modified

**Backend:**
- `backend/src/controllers/userController.js` - User CRUD operations
- `backend/src/routes/users.js` - User routes
- `backend/src/server.js` - Added user routes

**Frontend:**
- `frontend/src/pages/Settings.jsx` - Added Users and Shifts tabs with forms and tables

### Key Features

1. **Password Security:**
   - Passwords are hashed using bcrypt (10 salt rounds)
   - Passwords are never returned in API responses
   - Password field is optional when editing (leave blank to keep current)

2. **Role-Based Access:**
   - Admins: Full access, no shift restrictions
   - Operators: Must have shift assigned, access restricted to shift hours
   - Managers: Can manage shifts
   - Viewers: Read-only access

3. **Validation:**
   - Username and email must be unique
   - Shift is required for operators
   - Only active shifts can be assigned
   - Cannot delete shift if assigned to users
   - Cannot delete your own account

4. **User Experience:**
   - Clean tabbed interface
   - Form validation
   - Error messages
   - Success notifications
   - Color-coded role badges
   - Clear time format (HH:mm)
   - Helpful placeholder text and descriptions

## Access Control Flow

1. **Operator Login:**
   - Operator logs in with username/password
   - System checks if operator has shift assigned
   - System checks if current time is within shift hours
   - Access granted only if within shift hours

2. **Admin Access:**
   - Admins can access system 24/7
   - Admins can view all data (no client restrictions)
   - Admins can manage all users and shifts

3. **Shift Assignment:**
   - Operators must have a shift assigned
   - Shift must be active
   - Multiple operators can have the same shift
   - Operators can only access system during their shift hours

## Notes

- The shift_id column in the users table was added via migration script (`add-shifts-schema.js`)
- For existing databases without shift_id column, the code handles it gracefully
- All passwords are stored securely using bcrypt hashing
- The UI provides a complete access management solution for operators based on shifts


