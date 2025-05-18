require('dotenv').config();
const express = require('express');
const cors = require('cors');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // load from .env
const app = express();

// Specific CORS configuration for development and production
const allowedOrigins = [
  'http://localhost:5175', // Your local React frontend
  'http://localhost:3000',  // Common React development port
  'https://reliance.orbits-it.com',
  'https://reliance.orbits-it.com/wp-content/themes/your-theme/react-app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked for:', origin);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle OPTIONS preflight requests
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  }
}));

app.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reliance.orbits-it.com/wp-content/themes/your-theme/react-app';

app.post('/create-checkout-session', async (req, res) => {
    const booking = req.body;
    console.log("Creating Stripe session with price:", booking.price);
    console.log("Calculated unit amount:", Math.round(booking.price * 100));
    console.log("Booking response (backend): ", booking);
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'Moving Service',
                        description: `From ${booking.pickupAddress?.city} to ${booking.dropAddress?.city}`,
                    },
                    unit_amount: Math.round(booking.price * 100), // in pence
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/#/payment-failed`,
            metadata: {
                email: booking.email || 'NA',
                quoteRef: booking.quotationRef || 'NA',
                // bookingRef: booking.bookingRef || 'NA',
                username: booking.username,
                phoneNumber: booking.phoneNumber,

                // Pickup
                plocation: booking.pickupLocation.location || 'NA',
                pfloor: String(booking.pickupLocation.floor ?? '0'),
                plift: String(booking.pickupLocation.liftAvailable ?? false),
                ppropertyType: booking.pickupLocation.propertyType || 'standard',
                ppostcode: booking.pickupAddress.postcode || '',
                paddressLine1: booking.pickupAddress.addressLine1 || '',
                paddressLine2: booking.pickupAddress.addressLine2 || '',
                pcity: booking.pickupAddress.city || '',
                pcountry: booking.pickupAddress.country || '',
                pflatNo: booking.pickupAddress.flatNo || '',
                pcontactName: booking.pickupAddress.contactName || '',
                pcontactPhone: booking.pickupAddress.contactPhone || '',

                // Drop
                dlocation: booking.dropLocation.location || 'NA',
                dfloor: String(booking.dropLocation.floor ?? '0'),
                dlift: String(booking.dropLocation.liftAvailable ?? false),
                dpropertyType: booking.dropLocation.propertyType || 'standard',
                dpostcode: booking.dropAddress.postcode || '',
                daddressLine1: booking.dropAddress.addressLine1 || '',
                daddressLine2: booking.dropAddress.addressLine2 || '',
                dcity: booking.dropAddress.city || '',
                dcountry: booking.dropAddress.country || '',
                dflatNo: booking.dropAddress.flatNo || '',
                dcontactName: booking.dropAddress.contactName || '',
                dcontactPhone: booking.dropAddress.contactPhone || '',
                // Serialized arrays
                extraStops: JSON.stringify(booking.ExtraStopsArray || []),
                items: JSON.stringify(booking.itemsArray || []),

                // Journey and timing
                distance: String(booking.distance),
                duration: booking.duration || '',
                pickupDate: booking.pickupDate || '',
                pickupTime: booking.pickupTime || '',
                dropDate: booking.dropDate || '',
                dropTime: booking.dropTime || '',

                // Misc
                worker: String(booking.worker ?? 1),
                van: booking.vanType || '',
                price: String(booking.price ?? 0),
                itemsToDismantle: String(booking.itemsToDismantle ?? '0'),
                itemsToAssemble: String(booking.itemsToAssemble ?? '0'),
                isBusinessCustomer: String(booking.details.isBusinessCustomer ?? false),
                motorBike: booking.details.motorBike || '',
                piano: booking.details.piano || '',
                specialRequirements: booking.details.specialRequirements || '',
            }
        });
        res.json({ sessionId: session.id });
    } catch (error) {
        console.error('Stripe error details:', error.message);
        console.error('Stripe session creation failed:', error);
        res.status(500).json({ error: 'Unable to create Stripe session' });
    }
});

const PORT = process.env.PORT || 5000;

app.get('/checkout-session/:id', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.id);
        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Invalid session ID' });
    }
});

// Add a simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));