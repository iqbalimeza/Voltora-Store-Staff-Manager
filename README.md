# a. Project Title & Description

Project Title: Voltora Store Staff Task Manager

VOLTORA is a web-based electronics repair and service platform designed to manage repair requests, customer services, staff tasks and daily store operations. It allows customers to explore repair services, submit repair requests and track repair progress. Managers can manage repair operations, assign technicians, monitor staff performance and generate reports. Technicians can view assigned repairs and update their work progress.



# b. Features Included

1. **Dashboard** – Displays key performance indicators (KPIs), repair statistics and charts.
2. **Authentication & Role Management** – Provides different access levels for managers, staff, technicians and customers.
3. **Repair Services Catalogue** – Offers 60 repair services across six categories, including smartphones, laptops, desktop PCs, accessories, software and cameras.
4. **Repair Request** – Allows customers to submit repair requests with pickup or delivery options and attach up to three photos.
5. **Repair Tracking** – Allows customers to track repair progress using a repair ID and contact number.
6. **Repair Management** – Enables managers to review, approve, reject, assign and update repair requests.
7. **Staff Management** – Allows managers to manage staff information and responsibilities.
8. **Task Management** – Allows staff and technicians to view assigned tasks, update progress and complete repairs.
9. **Schedule Management** – Provides staff scheduling and roster management.
10. **Finance Management** – Records store expenses, repair payments and repair costs.
11. **Reports & Analytics** – Provides repair statistics, performance charts and CSV exports.
12. **Service Catalogue Management** – Allows managers to add, edit, hide and delete repair services and categories.
13. **Notifications** – Provides in-app notifications based on user roles.
14. **Appearance Settings** – Supports Dark Mode, Light Mode, System Mode and eight accent colour palettes.
15. **Customer Settings** – Allows customers to update their profile, phone number, password and appearance preferences.

# c. Instructions to Test Login

To test the system, open the website and click **Login**. Use the following demo accounts to access different user roles.

**Password for all demo accounts:** `Voltora@123`

| User Role | Email |
|---|---|
| Manager / Administrator | iqbal@voltora.my |
| Staff | adli@voltora.my |
| Repair Technician 1 | farid@voltora.my |
| Repair Technician 2 | jason@voltora.my |
| Customer (Read Only) | customer@voltora.my |

**Testing Instructions:**

1. Open the website and navigate to the Login page.
2. Enter one of the demo email addresses provided above.
3. Enter the common demo password: `Voltora@123`.
4. Click the Login button.
5. Explore the available features according to the selected user role.

**Testing Notes:**
- Manager: Has full access to the system, including Repair Management and Service Catalogue Management.
- Staff: Can access their own assigned tasks.
- Repair Technicians: Can view and update their assigned repair jobs.
- Customer: Has read-only access to selected system sections and can view their own repair information.
- Visitors: Can submit repair requests through the Services page without logging in.

**Important:** This is a front-end prototype that uses browser localStorage for demo data. Login authentication and role restrictions are implemented on the client side and are not intended for real-world security. Data is stored locally in the browser and is not synchronised across different devices.

# d. Frameworks / Libraries Used

| Framework / Library | Version | Purpose |
|---|---|---|
| HTML5 | - | Website structure and content |
| CSS3 | - | Website styling and responsive layouts |
| JavaScript (Vanilla JS) | - | Functionality and interactive features |
| Bootstrap | 5.3.3 | Responsive layout and UI components |
| Bootstrap Icons | 1.11.3 | Interface icons |
| Chart.js | 4.4.3 | Dashboard charts and data visualisation |

**Fonts Used:**
- Plus Jakarta Sans
- Sora
