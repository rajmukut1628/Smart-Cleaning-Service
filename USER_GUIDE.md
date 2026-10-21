# User Feature Guide - Smart Cleaning Service

## 🎯 User এর জন্য যা যা করা যাবে

### 1. **Registration & Login**
**কিভাবে করবেন:**
- Landing page থেকে "Get Started" বা "Sign Up" বাটনে ক্লিক করুন
- Name, Email, Password দিয়ে registration করুন
- Login করুন email ও password দিয়ে

---

### 2. **Service Booking (সার্ভিস বুক করা)**
**কিভাবে করবেন:**
1. Dashboard বা Services page এ যান
2. যেকোনো service card এ "Book Now" বাটনে ক্লিক করুন
3. Booking form পূরণ করুন:
   - **Service Address:** সম্পূর্ণ ঠিকানা লিখুন
   - **Area Measurement Unit:** তিনটি option থেকে select করুন:
     - **Square Feet** - dropdown থেকে select করুন বা custom value দিন
     - **Unit (Rooms/Apartments)** - bedroom সংখ্যা select করুন বা custom দিন
     - **Others** - আপনার নিজের measurement দিন
   - **Preferred Date:** তারিখ select করুন
   - **Preferred Time:** সময় select করুন (9 AM - 4 PM)
   - **Special Instructions:** (Optional) কোনো বিশেষ নির্দেশনা
4. Total amount দেখুন (automatically calculate হবে)
5. "Confirm Booking" বাটনে ক্লিক করুন

**Status:**
- **Pending** - Admin এখনো worker assign করেনি
- **Confirmed** - Worker assign হয়েছে
- **In-Progress** - কাজ চলছে
- **Completed** - কাজ শেষ
- **Cancelled** - বাতিল করা হয়েছে

---

### 3. **Profile Management (প্রোফাইল ম্যানেজমেন্ট)**
**কিভাবে করবেন:**
1. Header থেকে "Profile" মেনুতে ক্লিক করুন
2. আপনার profile দেখতে পারবেন

**Profile Picture Upload:**
- Profile picture এর উপর camera icon এ ক্লিক করুন
- Image file select করুন (max 5MB)
- Automatically upload হবে

**Profile Edit:**
1. "Edit Profile" বাটনে ক্লিক করুন
2. Update করুন:
   - Name
   - Email
   - Phone Number
   - Address
3. "Save Changes" বাটনে ক্লিক করুন

**Password Change:**
1. "Change Password" বাটনে ক্লিক করুন
2. Modal এ দিন:
   - Current Password
   - New Password (minimum 6 characters)
   - Confirm New Password
3. "Change Password" বাটনে ক্লিক করুন

---

### 4. **Booking Management (বুকিং ম্যানেজমেন্ট)**
**কিভাবে দেখবেন:**
1. User Dashboard এ যান
2. "Your Bookings" section এ সব bookings দেখতে পারবেন
3. প্রতিটি booking এ দেখবেন:
   - Service name
   - Scheduled date & time
   - Status (Pending/Confirmed/In-Progress/Completed)
   - Assigned worker (যদি থাকে)
   - Total amount

**Review দেওয়া:**
- Completed booking এর জন্য "Review" বাটন আসবে
- Rating দিন (1-5 stars)
- Review লিখুন
- Before/After photos upload করতে পারবেন (optional)

---

### 5. **Chat Interface (চ্যাট করা)**
**কিভাবে করবেন:**
1. Header থেকে "Chat" মেনুতে ক্লিক করুন
2. Worker বা admin এর সাথে real-time chat করতে পারবেন
3. Message লিখে send করুন

---

### 6. **Cleaning Tips (পরিষ্কারের টিপস)**
**কিভাবে দেখবেন:**
1. Header থেকে "Cleaning Tips" মেনুতে ক্লিক করুন
2. বিভিন্ন cleaning tips পড়তে পারবেন

---

### 7. **Services Browse করা**
**কিভাবে করবেন:**
1. "Services" মেনুতে ক্লিক করুন
2. সব available services দেখতে পারবেন
3. প্রতিটি service এ আছে:
   - Service name ও image
   - Description
   - Base price
   - Price per sq ft
   - Duration
   - Features list

---

## 📋 Quick Actions

### Dashboard থেকে:
- ✅ নতুন booking করা
- ✅ সব bookings দেখা
- ✅ Pending bookings check করা
- ✅ Completed bookings review করা

### Profile থেকে:
- ✅ Personal info update করা
- ✅ Profile picture change করা
- ✅ Password change করা
- ✅ Contact details update করা

---

## 🔔 Notifications দেখা
- Booking confirmation
- Worker assigned
- Service completed
- Review reminder

---

## 💡 Tips:

1. **Booking করার সময়:**
   - সঠিক address ও area size দিন যাতে accurate pricing হয়
   - Special instructions এ যেকোনো বিশেষ requirement mention করুন

2. **Profile Update:**
   - সব information update রাখুন
   - Phone number অবশ্যই দিন যাতে worker যোগাযোগ করতে পারে

3. **Review:**
   - Completed service এর review দিন
   - Before/After photos upload করলে ভালো

4. **Area Measurement:**
   - **Square Feet** সঠিকভাবে দিন
   - **Unit** option ব্যবহার করুন room based service এর জন্য
   - **Others** option যেকোনো custom measurement এর জন্য

---

## 🆘 Support:
যেকোনো সমস্যার জন্য Chat interface ব্যবহার করে admin এর সাথে যোগাযোগ করুন।

---

## 🎨 Platform Features:

### ✅ Implemented:
- User Registration & Login
- Dynamic Service Booking with flexible unit types
- Profile Management (Edit, Picture Upload, Password Change)
- Booking History
- Review System
- Real-time Chat
- Cleaning Tips
- Responsive Design

### 🔄 Dynamic Features:
- **Unit Configuration:** Admin যেকোনো সময় unit types change করতে পারে
- **Service Management:** Admin নতুন services add/edit করতে পারে
- **Price Calculation:** Automatically calculate based on area & unit type

---

**Note:** এই platform সম্পূর্ণ dynamic তাই admin panel থেকে যেকোনো changes automatic reflect হবে user interface এ।

## Worker workspace

- **Jobs (`/jobs`)**: Search/filter assigned jobs, open assignment details, upload before/after photos, start a confirmed job, and confirm completion of work in progress.
- **Dashboard (`/worker-dashboard`)**: Active assignments, actual work counts and customer feedback. **Update work location** opens the location editor in My Profile; **Earnings report** opens `/earnings`.
- **Earnings (`/earnings`)**: Equal share of completed booking values, customer cash confirmation status, monthly totals and CSV export. These amounts are allocated service values, not confirmed worker payouts. `/performance` redirects here.
- **My Profile (`/profile`)**: Contact information, service area, experience, skills, bio and profile photo. Verification status is controlled by administrators.
- **Settings (`/settings`)**: Available in the account menu between My Profile and Logout. Save preferred weekly work hours or change your password. Changing availability does not reschedule existing jobs.
- Older completed bookings without a recorded completion timestamp use their last update date in earnings reports and are marked accordingly.
- Authenticated navigation order is Home → Dashboard → role-specific features for customers, workers, administrators and superadministrators on desktop and mobile. Account changes remount the authenticated workspace to clear the previous account's page state.

### Worker notifications

The worker bell opens an account-specific inbox of current assignment/status/schedule updates (latest 50 updated assigned bookings), confirmed customer cash payments, and recent customer reviews (latest 20). It refreshes every 20 seconds and when the app regains focus. Read state is stored on the server per worker. Photo uploads do not reset a job notification to unread. Open an update to go directly to the assigned job, earnings report, or customer feedback. This is a current-work inbox, not a historical audit log or a worker payout ledger. Unassigned jobs and other workers' private updates are excluded.

### Public website navigation

Home provides a compact blue landing experience with current public service previews and customer reviews. Services (`/services`), Contact (`/contact`), Reviews (`/reviews`) and How It Works (`/how-it-works`) each open their own focused page. Old homepage section URLs redirect to the matching page. Contact displays account support and only the phone, email or WhatsApp channels configured for the business. Catalog booking controls are available to customers and signed-out visitors; worker/admin accounts can browse services without creating customer bookings. The FAQ describes supported booking and cash-payment behavior without claiming unconfigured support hours or policies.

### Customer registration, notifications and Cleaning Tips

Registration creates a customer account and returns the visitor to Login. It does not issue a login token, store an authenticated session, or sign the visitor in automatically. A separate successful login is required.

The customer bell opens a private inbox for the current customer's latest 50 updated bookings: status/schedule/team changes, confirmed cash payments, and eligible review reminders. Read state is saved per account. Notification links open the matching owned booking or eligible review form. The inbox refreshes every 20 seconds; it does not redirect to Chat.

Cleaning Tips retains all original 12 tips, four categories, difficulty labels and Hygiene Awareness information. Its new blue studio layout includes category navigation and decorative animation, with reduced-motion support.

### Customer dashboard

The customer dashboard uses compact real-data summary cards, a searchable booking list, All/Active/Completed/Cancelled filters, and four bookings per page. Confirmed spending counts only paid completed services. A separate overview highlights an active booking, with review reminders and support access. Booking details, before/after photo access, reviews and notification deep links remain available. Loading failures show a retry action and unknown totals rather than invented zeros.
