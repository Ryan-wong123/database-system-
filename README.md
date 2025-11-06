# database-system

## Startup

```
cd food-donation
```
```
npm install
```
```
cd backend
```
```
npm install
```

open first terminal
```
cd food-donation
```
```
cd backend
```
```
ssh -L 5433:localhost:5432 db-dev@35.212.169.134
```
ssh password:
```
ran1doms2tring3@lol
```

Second terminal run
```
cd food-donation
```
```
cd backend
```
```
node server.js
```

Third terminal run
```
cd food-donation
```
```
npm start
```

run this to start server and webpage
```
powershell -ExecutionPolicy Bypass -File .\Start-FoodDonation.ps1
```

check for blocking ports on 8000
```
netstat -ano | findstr :8000
```

## generate embeddings for food search
```
$env:PG_HOST = "localhost"
```
```
$env:PG_USER = "postgres"
```

```
$env:PG_PASSWORD = "ran1doms2tring3@lol"
```

```
$env:PG_DATABASE = "inf2003db"
```
```
$env:PG_PORT = "5432"
```

```
$env:OPENAI_API_KEY = "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"
```

```
$env:MONGO_URI = "mongodb+srv://fooddonor:root@cluster0.tx37mvn.mongodb.net/foodDonationDB"
```

```
$env:MONGO_DBNAME = "foodDonationDB"
```

```
$env:EMBEDDING_MODEL = "text-embedding-3-small"
```

```
node backend/scripts/seed_food_embeddings.js
```

# Code Structure breakdown

## Components

### Footer
Footer of the website for contact us and about us

### Navbar
Role-aware nav links and auth buttons.

### Item card
Re-usable card for display text

## Context
### AuthContext
Front end user session management

## Hooks
### useFetchData
boiler plate for loading data

## Pages
### About us
About this website

### Booking
For Donee to book timing and food preferences

### Contact us
Contact info

### Dashboard
For admin to manage the bookings status and manage food properties(quantity, location, etc)

### Donate
For donor to donate food items

### Donation History
- For Donor to see what they have donate
- For Donee to see what they have recieved
- For Admin to see what both donor and donee have donated/recieved

### Home
Landing page

### Inventory
For Admin, Donor, Donee to see the different food items at different locations

### Login
User login

### Profile
profile of the user

### Register
User registration

## Services
### Api.js
- **AuthAPI**
  - `login`
  - `register`

- **DonationAPI**
  - `createDonation`
  - `listRecent`
  - `myDonations`

- **InventoryAPI**
  - `list`
  - `getNearingExpiry`

- **BookingAPI**
  - `create`
  - `myBookings`
  - `availability`
  - `adminList`
  - `updateStatus`

- **LocationsAPI**
  - `list`
  - `updateItem`
  - `updateLot`


## App.js
Main application component. Defines routes, layout (Navbar + Footer), and role-based access control using ProtectedRoute.
