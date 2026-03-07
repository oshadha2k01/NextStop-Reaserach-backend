# SMTP Email Configuration Guide

## ✅ Email OTP is now enabled!

OTP codes will be sent to the admin's email inbox during registration.

---

## 🔧 Manual Configuration Required

### Step 1: Update `.env` file

Open `backend/.env` and replace **YOUR_EMAIL@gmail.com** with your actual Gmail address:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=ytjgkaphgyooimol
SMTP_FROM=NextStop <your-actual-email@gmail.com>
```

**Example:**
```env
SMTP_USER=raveeshaperera@gmail.com
SMTP_PASS=ytjgkaphgyooimol
SMTP_FROM=NextStop <raveeshaperera@gmail.com>
```

---

### Step 2: Verify Gmail App Password (Already Done ✅)

You already have your app password: `ytjg kaph gyoo imol` (spaces removed: `ytjgkaphgyooimol`)

**If you need a new app password:**
1. Go to https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. Select **Mail** and **Windows Computer**
4. Click **Generate**
5. Copy the 16-character password
6. Update `SMTP_PASS` in `.env`

---

### Step 3: Enable Gmail Access (Important!)

Make sure your Gmail account allows app passwords:

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (required for app passwords)
3. Then you can create app passwords

---

### Step 4: Restart Backend Server

After updating `.env`:

```powershell
# Stop current server (Ctrl+C)
# Then restart:
cd "d:\Super Admin\NextStop-Reaserach-backend\backend"
npm run dev
```

---

## 📧 Testing Email OTP

### 1. Register Admin
```http
POST http://localhost:3000/api/admin/register
Content-Type: application/json

{
  "firstName": "Raveesha",
  "lastName": "Perera",
  "username": "ravee_admin",
  "email": "test@example.com",
  "phoneNo": "0712345678",
  "password": "Admin@12345"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email. Please check your inbox (and spam folder).",
  "email": "test@example.com",
  "expiresIn": "5 minutes"
}
```

### 2. Check Email Inbox
- Open the email address you used in the registration
- Look for email from your Gmail (SMTP_USER)
- Subject: "NextStop Admin Registration - OTP Verification"
- Copy the 6-digit OTP code

### 3. Verify OTP
```http
POST http://localhost:3000/api/admin/verify-otp
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified! Admin registered successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "ravee_admin"
}
```

---

## 🐛 Troubleshooting

### Email not received?

1. **Check spam/junk folder** - Gmail may filter it
2. **Check server console** - OTP is still logged there as backup
3. **Verify SMTP_USER** - Must be a valid Gmail address
4. **Check app password** - Must be exactly 16 characters (no spaces)
5. **Try different email** - Some providers block automated emails

### Still not working?

Check backend console for error messages:
- `❌ Error sending OTP email:` indicates SMTP issue
- `✅ OTP email sent successfully` means it worked

### Common Errors:

**"Invalid login"**
- App password is wrong or expired
- Generate new app password

**"Connection timeout"**
- Firewall blocking port 465
- Try SMTP_PORT=587 with SMTP_SECURE=false

---

## 📋 Final Checklist

- [ ] Updated `SMTP_USER` in `.env` with real Gmail
- [ ] Updated `SMTP_FROM` in `.env` with real Gmail  
- [ ] Verified app password is correct (16 chars, no spaces)
- [ ] Enabled 2-Step Verification in Google account
- [ ] Restarted backend server
- [ ] Tested `/register` endpoint
- [ ] Received email in inbox
- [ ] Successfully verified OTP

---

## 🎯 Quick Setup (TL;DR)

**Edit `backend/.env`:**
```env
SMTP_USER=yourrealemail@gmail.com
SMTP_PASS=ytjgkaphgyooimol
SMTP_FROM=NextStop <yourrealemail@gmail.com>
```

**Restart server, test registration!**

---

## 💡 Tips

- OTP expires in **5 minutes**
- Pending registrations auto-delete after **15 minutes**
- OTP is also logged to console as backup
- Email has fancy HTML formatting for better user experience
- Check spam folder if email doesn't arrive in inbox

---

**Need help?** Check the error messages in your backend console for debugging.
