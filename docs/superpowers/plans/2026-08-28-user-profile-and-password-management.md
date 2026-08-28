# User Profile & Password Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated "Tài Khoản Của Tôi" (My Account) page allowing any authenticated user to update their personal information and securely change their password.

**Architecture:** Frontend React component communicating with Core User IAM (`PUT /api/v1/users/{id}/profile`, `POST /api/v1/auth/change-password`) and Face AI Attendance Backend (`PUT /api/v1/employees/{id}`).

**Tech Stack:** React 19, Tailwind CSS, Lucide React, Axios, FastAPI, SQLAlchemy, Pydantic.

---

### Task 1: Add API client methods in `frontend/src/services/api.js`
**Files:**
- Modify: `frontend/src/services/api.js`

- [x] **Step 1: Add `updateMyProfile` and `changePassword` API client functions**
```javascript
  updateMyProfile: (userId, data) => coreUserClient.put(`/users/${userId}/profile`, data),
  changePassword: (oldPassword, newPassword) =>
    coreUserClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    }),
```

---

### Task 2: Create `UserProfileManager.jsx` component
**Files:**
- Create: `frontend/src/components/UserProfileManager.jsx`

- [x] **Step 1: Build `UserProfileManager.jsx` with Hero Banner, Profile Editor, Password Changer, and Face AI Biometrics inspection**
- [x] **Step 2: Add validation, loading states, and toast notifications**

---

### Task 3: Integrate `MY_ACCOUNT` in `Sidebar.jsx`, `App.jsx`, and `i18n` locales
**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/i18n/locales/vi.js`
- Modify: `frontend/src/i18n/locales/en.js`

- [x] **Step 1: Add `NAV_TABS.MY_ACCOUNT = 'MY_ACCOUNT'` in `Sidebar.jsx`**
- [x] **Step 2: Render `UserProfileManager` in `App.jsx` when `currentTab === NAV_TABS.MY_ACCOUNT`**
- [x] **Step 3: Add translation strings in `vi.js` and `en.js`**

---

### Task 4: Verification with E2E Testing
**Files:**
- Modify: `tests/test_e2e_full_system.py`

- [x] **Step 1: Add Module 9 in `test_e2e_full_system.py` testing profile update & password change**
- [x] **Step 2: Run automated test suite and confirm 100% pass**
